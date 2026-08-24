/**
 * 本地密码保管箱安全加解密服务 (基于 Web Crypto API AES-GCM 256位)
 */

// 默认内置的本地存储混淆密钥（用户可随时设置独立主密码升级加密强度）
const DEFAULT_KEY_SALT = 'SAP_QUICK_LOGON_VAULT_SALT_v1';

async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(plainText: string, masterPassword = 'DEFAULT_LOCAL_VAULT_KEY'): Promise<string> {
  if (!plainText) return '';
  try {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(masterPassword, DEFAULT_KEY_SALT);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // 转为 base64
    let binary = '';
    const bytes = new Uint8Array(combined);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('加密失败:', err);
    return plainText; // 降级处理
  }
}

export async function decryptText(cipherText: string, masterPassword = 'DEFAULT_LOCAL_VAULT_KEY'): Promise<string> {
  if (!cipherText) return '';
  try {
    const binary = atob(cipherText);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes.length < 13) return cipherText;

    const iv = bytes.slice(0, 12);
    const encrypted = bytes.slice(12);
    const key = await deriveKey(masterPassword, DEFAULT_KEY_SALT);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    // 若无法解密则返回原样（可能为明文）
    return cipherText;
  }
}

/**
 * 拷贝密码到剪贴板，并在指定秒数后自动清空
 */
export async function copyToClipboardWithTimeout(text: string, timeoutSec = 30, onCleared?: () => void): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    if (timeoutSec > 0) {
      setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
            onCleared?.();
          }
        } catch {
          // ignore clipboard read permission error
        }
      }, timeoutSec * 1000);
    }
    return true;
  } catch (err) {
    console.error('剪贴板复制失败:', err);
    return false;
  }
}

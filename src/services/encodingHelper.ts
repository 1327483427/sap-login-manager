/**
 * 字符编码与乱码智能修复工具 (支持 UTF-8, GBK, GB2312, GB18030, UTF-16LE, Latin1 自动侦测与修复)
 */

/**
 * 修复常见的双重编码/误用 Latin1 解码 UTF-8 或 GBK 产生的乱码 (Mojibake)
 * 例如: "è¯ºè´ å°”" -> "诺贝尔", "Åµ±´¶û" -> "诺贝尔"
 */
export function fixMojibake(str: string): string {
  if (!str) return '';

  // 1. 如果包含常见的 UTF-8 误解为 Latin1/Windows-1252 的乱码特征字符 (如 ä, å, æ, ç, è, é, ê, ë, ì, í, î, ï, ð, ñ, ò, ó, ô, õ, ö, ÷, ø, ù, ú, û, ü, ý, þ, ÿ)
  const hasUtf8Mojibake = /[\u00C0-\u00FF]{2,}/.test(str);
  if (hasUtf8Mojibake) {
    try {
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i) & 0xFF;
      }
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      // 成功恢复为中文字符串
      if (/[\u4e00-\u9fa5]/.test(decoded)) {
        return decoded;
      }
    } catch {
      // 尝试按 GB18030 修复
      try {
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          bytes[i] = str.charCodeAt(i) & 0xFF;
        }
        const decoded = new TextDecoder('gb18030', { fatal: true }).decode(bytes);
        if (/[\u4e00-\u9fa5]/.test(decoded)) {
          return decoded;
        }
      } catch {}
    }
  }

  // 2. 解码 XML 实体字符 (&#x4e2d; 或 &#20013; 等)
  if (/&#(?:x[0-9a-fA-F]+|[0-9]+);/.test(str)) {
    str = str.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    str = str.replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  }

  // 3. 解码 URL 编码 (例如 %E6%B7%B1%E5%9C%B3)
  if (/%[0-9a-fA-F]{2}/.test(str)) {
    try {
      str = decodeURIComponent(str);
    } catch {}
  }

  return str;
}

/**
 * 智能将二进制 Buffer 或 Uint8Array 解码为文本字符串
 * 优先按 BOM、XML encoding、严格 UTF-8、GB18030 (包含 GBK, GB2312) 进行多级探测
 */
export function decodeSmartBuffer(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length === 0) return '';

  // 1. 探测 BOM 标头
  // UTF-8 BOM: EF BB BF
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    const raw = new TextDecoder('utf-8').decode(bytes.subarray(3));
    return fixMojibake(raw);
  }

  // UTF-16LE BOM: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    const raw = new TextDecoder('utf-16le').decode(bytes.subarray(2));
    return fixMojibake(raw);
  }

  // UTF-16BE BOM: FE FF
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    const raw = new TextDecoder('utf-16be').decode(bytes.subarray(2));
    return fixMojibake(raw);
  }

  // 2. 检查前 200 个字节中是否显式声明了 XML 编码
  const headAscii = String.fromCharCode(...Array.from(bytes.subarray(0, Math.min(200, bytes.length))));
  const encMatch = headAscii.match(/encoding=["']([^"']+)["']/i);
  if (encMatch && encMatch[1]) {
    const declaredEnc = encMatch[1].toLowerCase().trim();
    if (['gbk', 'gb2312', 'gb18030', 'cp936'].includes(declaredEnc)) {
      try {
        const raw = new TextDecoder('gb18030').decode(bytes);
        return fixMojibake(raw);
      } catch {}
    } else if (['utf-16', 'utf-16le'].includes(declaredEnc)) {
      try {
        const raw = new TextDecoder('utf-16le').decode(bytes);
        return fixMojibake(raw);
      } catch {}
    }
  }

  // 3. 尝试使用严格模式 UTF-8 进行解码 (遇到无效 UTF-8 字节将抛出异常)
  try {
    const strictUtf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return fixMojibake(strictUtf8);
  } catch {
    // 不是标准的 UTF-8 编码 (通常是 Windows 下的 GBK / GB2312 / ANSI 配置文件)
  }

  // 4. 降级尝试 GB18030 (超集覆盖 GBK 与 GB2312)
  try {
    const gbkDecoded = new TextDecoder('gb18030').decode(bytes);
    return fixMojibake(gbkDecoded);
  } catch {}

  // 5. 最终后备方案：普通 UTF-8
  const fallback = new TextDecoder('utf-8').decode(bytes);
  return fixMojibake(fallback);
}

/**
 * 字符串清理工具：去除不可见控制字符并去除可能残留的 BOM
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return fixMojibake(text)
    .replace(/^\uFEFF/, '') // 移除首部 BOM
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // 移除无效控制字符
}

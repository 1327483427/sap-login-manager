import { SapSystem } from '../types/sap';
import { parseSapLandscapeXml, parseSapLogonIni } from './landscapeParser';
import { generateSapShortcutContent } from './sapShortcut';

export interface ScanResult {
  success: boolean;
  foundFiles: Array<{
    path: string;
    name: string;
    type: string;
    size: number;
    content: string;
  }>;
  foundShortcuts: Array<{
    path: string;
    filename: string;
    content: string;
  }>;
  osPlatform?: string;
  error?: string;
}

export interface ParsedSapShortcut {
  filename: string;
  sid: string;
  client: string;
  username: string;
  language: string;
  command: string;
  description: string;
  server?: string;
}

/**
 * 解析单个 .sap 快捷方式文件内容
 */
export function parseIndividualSapShortcut(content: string, filename: string): ParsedSapShortcut {
  const lines = content.split(/\r?\n/);
  const map: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }

  return {
    filename,
    sid: map['Name'] || map['System'] || filename.replace('.sap', ''),
    client: map['Client'] || '800',
    username: map['User'] || map['Name'] || '',
    language: map['Language'] || 'ZH',
    command: map['Command'] || '*SESSION_MANAGER',
    description: map['Title'] || map['Description'] || filename,
    server: map['Server'] || '',
  };
}

/**
 * 触发本地自动扫描 SAP 配置与快捷方式
 */
export async function scanLocalSapConfigs(): Promise<{
  scannedFiles: ScanResult['foundFiles'];
  systems: SapSystem[];
  shortcuts: ParsedSapShortcut[];
}> {
  try {
    const res = await fetch('/api/auto-scan-sap');
    if (!res.ok) {
      throw new Error(`扫描接口请求失败: ${res.statusText}`);
    }
    const data: ScanResult = await res.json();
    if (!data.success) {
      throw new Error(data.error || '扫描未成功');
    }

    const allSystems: SapSystem[] = [];
    for (const file of data.foundFiles) {
      if (file.type === 'landscape_xml' || file.name.includes('Landscape')) {
        const parsed = parseSapLandscapeXml(file.content);
        allSystems.push(...parsed);
      } else if (file.type === 'logon_ini' || file.name.endsWith('.ini')) {
        const parsed = parseSapLogonIni(file.content);
        allSystems.push(...parsed);
      }
    }

    const shortcuts: ParsedSapShortcut[] = (data.foundShortcuts || []).map(sc => 
      parseIndividualSapShortcut(sc.content, sc.filename)
    );

    return {
      scannedFiles: data.foundFiles,
      systems: allSystems,
      shortcuts,
    };
  } catch (err) {
    console.warn('本地扫描 API 调用异常 (可能是纯静态托管环境):', err);
    return { scannedFiles: [], systems: [], shortcuts: [] };
  }
}

/**
 * 批量生成并保存所有系统的 .sap 快捷方式到桌面
 */
export async function batchExportShortcutsToDesktop(systems: SapSystem[]): Promise<{
  success: boolean;
  destDir?: string;
  savedFiles?: string[];
  error?: string;
}> {
  try {
    const shortcutsPayload = systems.map(sys => {
      const activeAcc = sys.accounts.find(a => a.id === sys.activeAccountId) || sys.accounts[0];
      const content = generateSapShortcutContent(sys, activeAcc);
      const safeName = `${sys.sid}_${activeAcc?.username || 'user'}_${sys.client}.sap`.replace(/[\/\\:*?"<>|]/g, '_');
      return {
        filename: safeName,
        content,
      };
    });

    const res = await fetch('/api/generate-desktop-shortcuts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortcuts: shortcutsPayload }),
    });

    if (!res.ok) {
      throw new Error(`桌面快捷方式生成失败: ${res.statusText}`);
    }

    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

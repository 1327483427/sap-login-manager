import { SapSystem, SapAccount } from '../types/sap';

/**
 * SAP sapshcut 命令行与 .bat 快捷登录执行服务
 */

export interface LaunchOptions {
  transaction?: string; // 登录后直接进入的事务码，如 "*SESSION_MANAGER", "SE38", "SU01"
  client?: string;
  language?: string;
}

/**
 * 构建 sapshcut 的 guiparm 连接字符串参数
 */
export function buildGuiParm(system: SapSystem): string {
  const inst = (system.instanceNumber || '00').padStart(2, '0');

  if (system.connectionType === 'group' && system.messageServer) {
    const group = system.group || 'PUBLIC';
    return `/M/${system.messageServer}/S/36${inst}/G/${group}`;
  }

  if (system.server) {
    const port = `32${inst}`;
    if (system.sapRouter) {
      return `${system.sapRouter}/H/${system.server}/S/${port}`;
    }
    return `/H/${system.server}/S/${port}`;
  }

  return '';
}

/**
 * 生成 Windows sapshcut 完整的命令行调用字符串
 */
export function generateSapshcutCommand(system: SapSystem, account?: SapAccount, options?: LaunchOptions): string {
  const activeAccount = account || system.accounts.find(a => a.id === system.activeAccountId) || system.accounts[0];
  const client = options?.client || system.client || '800';
  const user = activeAccount?.username || '';
  const pw = activeAccount?.password ? ` -pw="${activeAccount.password}"` : '';
  const lang = options?.language || system.language || 'ZH';
  const tx = options?.transaction || '*SESSION_MANAGER';
  const guiparm = buildGuiParm(system);

  const guiparmFlag = guiparm ? ` -guiparm="${guiparm}"` : '';

  return `sapshcut.exe -system=${system.sid} -client=${client} -user=${user}${pw} -language=${lang}${guiparmFlag} -command="${tx}"`;
}

/**
 * 生成 Windows .bat 批处理快捷登录脚本内容
 * 免密直连，自动探测 32位/64位 SAP GUI 安装目录，无需任何额外确认
 */
export function generateSapBatContent(system: SapSystem, account?: SapAccount, options?: LaunchOptions): string {
  const activeAccount = account || system.accounts.find(a => a.id === system.activeAccountId) || system.accounts[0];
  const client = options?.client || system.client || '800';
  const user = activeAccount?.username || '';
  const password = activeAccount?.password || '';
  const lang = options?.language || system.language || 'ZH';
  const tx = options?.transaction || '*SESSION_MANAGER';
  const guiparm = buildGuiParm(system);

  const guiparmArg = guiparm ? `-guiparm="${guiparm}"` : '';
  const pwArg = password ? `-pw="${password}"` : '';

  return `@echo off
chcp 65001 >nul
:: ===================================================
:: SAP Quick Logon - 自动生成的 SAP 免密直连批处理脚本
:: 系统: ${system.sid} (${system.name || system.sid})
:: 账号: ${user} | Client: ${client}
:: ===================================================

set "SAPSHCUT_EXE="

if exist "C:\\Program Files (x86)\\SAP\\FrontEnd\\SAPgui\\sapshcut.exe" (
    set "SAPSHCUT_EXE=C:\\Program Files (x86)\\SAP\\FrontEnd\\SAPgui\\sapshcut.exe"
) else if exist "C:\\Program Files\\SAP\\FrontEnd\\SAPgui\\sapshcut.exe" (
    set "SAPSHCUT_EXE=C:\\Program Files\\SAP\\FrontEnd\\SAPgui\\sapshcut.exe"
) else (
    set "SAPSHCUT_EXE=sapshcut.exe"
)

start "" "%SAPSHCUT_EXE%" -system=${system.sid} -client=${client} -user=${user} ${pwArg} -language=${lang} ${guiparmArg} -command="${tx}"
exit
`;
}

/**
 * 直接通过本地 API 打开 CMD 并执行 sapshcut 登录（免下载，直接呼起）
 */
export async function launchDirectSapshcut(
  system: SapSystem, 
  account?: SapAccount, 
  options?: LaunchOptions
): Promise<{ success: boolean; command?: string; message?: string }> {
  const activeAccount = account || system.accounts.find(a => a.id === system.activeAccountId) || system.accounts[0];
  const client = options?.client || system.client || '800';
  const language = options?.language || system.language || 'ZH';
  const transaction = options?.transaction || '*SESSION_MANAGER';
  const guiparm = buildGuiParm(system);
  const batContent = generateSapBatContent(system, activeAccount, options);

  const payload = {
    sid: system.sid,
    systemName: system.name || system.sid,
    client: client,
    user: activeAccount?.username || '',
    password: activeAccount?.password || '',
    language: language,
    transaction: transaction,
    guiparm: guiparm,
    batContent: batContent,
  };

  try {
    const res = await fetch('/api/launch-sap-shcut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('本地直连 API 请求失败，降级处理:', e);
  }

  // 若后端 API 无法访问（如纯静态环境），降级为下载 .bat 文件
  downloadSapBatFile(system, activeAccount, options);
  return { 
    success: true, 
    message: '已下载 .bat 批处理快捷方式，双击即可执行登录' 
  };
}

/**
 * 触发浏览器下载 .bat 批处理文件
 */
export function downloadSapBatFile(system: SapSystem, account?: SapAccount, options?: LaunchOptions): void {
  const content = generateSapBatContent(system, account, options);
  const activeAccount = account || system.accounts.find(a => a.id === system.activeAccountId) || system.accounts[0];
  const filename = `${system.sid}_${activeAccount?.username || 'user'}_${system.client}.bat`;

  const blob = new Blob([content], { type: 'application/x-bat;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 生成 macOS SAP GUI for Java 启动命令 / 连接字符串
 */
export function generateMacSapGuiCommand(system: SapSystem): string {
  const port = `32${(system.instanceNumber || '00').padStart(2, '0')}`;
  let connString = `/H/${system.server}/S/${port}`;
  if (system.sapRouter) {
    connString = `${system.sapRouter}/H/${system.server}/S/${port}`;
  }
  return `open -a "SAPGUI" --args "conn=${connString}"`;
}

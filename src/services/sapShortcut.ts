import { SapSystem, SapAccount } from '../types/sap';

/**
 * SAP 快捷方式与登录执行服务
 */

export interface LaunchOptions {
  transaction?: string; // 登录后直接进入的事务码，如 "*SESSION_MANAGER", "SE38", "SU01"
  client?: string;
  language?: string;
}

/**
 * 生成标准 SAP GUI 快捷方式 (.sap) 文件内容
 * 该格式被 SAP GUI for Windows 与 SAP GUI for Java 原生支持
 */
export function generateSapShortcutContent(system: SapSystem, account?: SapAccount, options?: LaunchOptions): string {
  const activeAccount = account || system.accounts.find(a => a.id === system.activeAccountId) || system.accounts[0];
  const client = options?.client || system.client || '800';
  const language = options?.language || system.language || 'ZH';
  const tx = options?.transaction || '*SESSION_MANAGER';

  const lines = [
    '[System]',
    `Name=${system.sid}`,
    `Description=${system.name || system.sid}`,
    `Client=${client}`,
  ];

  if (system.connectionType === 'group' && system.messageServer) {
    lines.push(`MessageServer=${system.messageServer}`);
    if (system.group) lines.push(`Group=${system.group}`);
  } else if (system.server) {
    lines.push(`Server=${system.server}`);
    lines.push(`SystemNumber=${system.instanceNumber || '00'}`);
  }

  if (system.sapRouter) {
    lines.push(`Router=${system.sapRouter}`);
  }

  lines.push(
    '',
    '[User]',
    `Name=${activeAccount?.username || ''}`,
    `Language=${language}`
  );

  if (activeAccount?.autoLogin && activeAccount?.password) {
    lines.push(`Password=${activeAccount.password}`);
  }

  lines.push(
    '',
    '[Function]',
    `Title=${system.name || system.sid}`,
    `Command=${tx}`,
    'Type=Transaction',
    '',
    '[Configuration]',
    'GuiParm=""',
    '',
    '[Options]',
    'Reuse=0'
  );

  return lines.join('\r\n');
}

/**
 * 触发浏览器直接下载 .sap 快捷方式文件
 */
export function downloadSapShortcut(system: SapSystem, account?: SapAccount, options?: LaunchOptions): void {
  const content = generateSapShortcutContent(system, account, options);
  const activeAccount = account || system.accounts.find(a => a.id === system.activeAccountId) || system.accounts[0];
  const filename = `${system.sid}_${activeAccount?.username || 'user'}_${system.client}.sap`;

  const blob = new Blob([content], { type: 'application/x-sapshortcut;charset=utf-8' });
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
 * 生成 Windows sapshcut 命令行调用字符串
 */
export function generateSapshcutCommand(system: SapSystem, account?: SapAccount): string {
  const activeAccount = account || system.accounts.find(a => a.id === system.activeAccountId) || system.accounts[0];
  const client = system.client || '800';
  const user = activeAccount?.username || '';
  const pw = activeAccount?.password ? ` -pw="${activeAccount.password}"` : '';
  const lang = system.language || 'ZH';

  let connParm = '';
  if (system.server) {
    const port = `32${(system.instanceNumber || '00').padStart(2, '0')}`;
    if (system.sapRouter) {
      connParm = ` -guiparm="${system.sapRouter}/H/${system.server}/S/${port}"`;
    } else {
      connParm = ` -guiparm="/H/${system.server}/S/${port}"`;
    }
  }

  return `sapshcut.exe -system=${system.sid} -client=${client} -user=${user}${pw} -language=${lang}${connParm} -command="*SESSION_MANAGER"`;
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

/**
 * 获取 WebGUI / Fiori 快速访问 URL
 */
export function getWebGuiLaunchUrl(system: SapSystem): string | null {
  if (system.webGuiUrl) {
    return system.webGuiUrl;
  }
  if (system.server) {
    const inst = system.instanceNumber || '00';
    return `https://${system.server}:443${inst}/sap/bc/gui/sap/its/webgui?sap-client=${system.client}&sap-language=${system.language}`;
  }
  return null;
}

export type EnvironmentType = 'PRD' | 'QAS' | 'DEV' | 'SBX' | 'OTHER';

export type ConnectionType = 'custom' | 'group' | 'webgui' | 'raw';

export interface SapAccount {
  id: string;
  alias: string;         // 账号别名，如 "日常开发", "BASIS管理员", "RFC服务号"
  username: string;      // 用户名，如 "LIQP", "DDIC"
  password: string;      // 密码（本地加密存储）
  isDefault?: boolean;   // 是否默认账号
  autoLogin?: boolean;   // 是否自动填充密码登录
  note?: string;         // 备注
}

export interface SapSystem {
  id: string;
  name: string;          // 显示名称，如 "S/4HANA 核心ERP生产系统"
  sid: string;           // 系统ID，如 "S4P"
  description?: string;  // 详细描述
  env: EnvironmentType;  // 环境类型 (PRD/QAS/DEV/SBX/OTHER)
  
  // 连接参数
  connectionType: ConnectionType;
  server: string;        // 应用服务器 IP 或 主机名，如 "10.10.8.20"
  instanceNumber: string;// 实例编号/系统编号，如 "00", "01"
  client: string;        // 默认客户端，如 "800", "100"
  language: string;      // 默认语言，如 "ZH", "EN", "DE"
  
  // 进阶参数
  messageServer?: string;// 消息服务器主机名
  group?: string;        // 登录组 / 服务器组，如 "SPACE", "PUBLIC"
  sapRouter?: string;    // SAProuter 字符串，如 "/H/vpn.corp.com/S/3299/W/pass/H/"
  webGuiUrl?: string;    // WebGUI 或 Fiori Launchpad 网址
  
  // 凭据与账号
  accounts: SapAccount[];
  activeAccountId?: string; // 当前选中的账号 ID
  
  // 分类与状态
  tags: string[];        // 标签，如 ["财务", "ABAP", "核心"]
  isFavorite: boolean;   // 是否星标收藏
  lastLoginAt?: number;  // 最近登录时间戳
  loginCount: number;    // 登录次数统计
  
  createdAt: number;
  updatedAt: number;
}

export interface VaultSettings {
  isLocked: boolean;
  hasMasterPassword: boolean;
  autoClearClipboardSec: number; // 复制密码后自动清空剪贴板秒数 (0为不清空)
  preferredLaunchMethod: 'sap_shortcut' | 'command_line' | 'download_file' | 'webgui';
  theme: 'dark' | 'light' | 'system';
}

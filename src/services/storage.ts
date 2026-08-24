import { SapSystem, VaultSettings } from '../types/sap';
import { DEFAULT_SAP_SYSTEMS } from '../mock/defaultSystems';

const STORAGE_KEY_SYSTEMS = 'SAP_QUICK_LOGON_SYSTEMS_v1';
const STORAGE_KEY_SETTINGS = 'SAP_QUICK_LOGON_SETTINGS_v1';

const DEFAULT_SETTINGS: VaultSettings = {
  isLocked: false,
  hasMasterPassword: false,
  autoClearClipboardSec: 30,
  preferredLaunchMethod: 'sap_shortcut',
  theme: 'dark',
};

export function loadSystemsFromStorage(): SapSystem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYSTEMS);
    if (!raw) {
      // 首次加载初始化示例数据
      saveSystemsToStorage(DEFAULT_SAP_SYSTEMS);
      return DEFAULT_SAP_SYSTEMS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('加载系统配置失败:', e);
    return DEFAULT_SAP_SYSTEMS;
  }
}

export function saveSystemsToStorage(systems: SapSystem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SYSTEMS, JSON.stringify(systems));
  } catch (e) {
    console.error('保存系统配置失败:', e);
  }
}

export function loadSettings(): VaultSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: VaultSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('保存设置失败:', e);
  }
}

export function exportBackupJson(systems: SapSystem[]): void {
  const data = {
    app: 'SAP Quick Logon',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    systems,
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SAP_Logon_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

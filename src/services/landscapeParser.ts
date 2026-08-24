import { SapSystem, EnvironmentType } from '../types/sap';

/**
 * SAPUILandscape.xml 与 saplogon.ini 导入解析器
 */

function guessEnvironment(name: string, sid: string): EnvironmentType {
  const upper = `${name} ${sid}`.toUpperCase();
  if (upper.includes('PRD') || upper.includes('PROD') || upper.includes('生产')) return 'PRD';
  if (upper.includes('QAS') || upper.includes('QA') || upper.includes('TEST') || upper.includes('测试') || upper.includes('UAT')) return 'QAS';
  if (upper.includes('DEV') || upper.includes('开发') || upper.includes('DEVELOP')) return 'DEV';
  if (upper.includes('SBX') || upper.includes('SAND') || upper.includes('沙箱') || upper.includes('TRAIN')) return 'SBX';
  return 'OTHER';
}

/**
 * 解析 SAPUILandscape.xml 文件内容
 */
export function parseSapLandscapeXml(xmlContent: string): SapSystem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  const systems: SapSystem[] = [];

  // 获取 Router 字典
  const routersMap = new Map<string, string>();
  const routerElements = doc.querySelectorAll('Routers > Router');
  routerElements.forEach(el => {
    const uuid = el.getAttribute('uuid') || '';
    const routerStr = el.getAttribute('router') || '';
    if (uuid && routerStr) routersMap.set(uuid, routerStr);
  });

  // 获取 MessageServers 字典
  const msgServersMap = new Map<string, { host: string; port?: string }>();
  const msgElements = doc.querySelectorAll('Messageservers > Messageserver');
  msgElements.forEach(el => {
    const uuid = el.getAttribute('uuid') || '';
    const host = el.getAttribute('host') || '';
    const port = el.getAttribute('port') || '';
    if (uuid && host) msgServersMap.set(uuid, { host, port });
  });

  // 解析 Services / Connections
  const serviceElements = doc.querySelectorAll('Services > Service');
  serviceElements.forEach((el, index) => {
    const name = el.getAttribute('name') || `SAP System ${index + 1}`;
    const sid = el.getAttribute('systemid') || el.getAttribute('sid') || name.slice(0, 3).toUpperCase();
    const server = el.getAttribute('server') || el.getAttribute('ip') || '';
    const systemNumber = el.getAttribute('systemnumber') || el.getAttribute('instancenumber') || '00';
    const client = el.getAttribute('client') || '800';
    const language = el.getAttribute('language') || 'ZH';
    const routerUuid = el.getAttribute('routerid') || '';
    const routerStr = routerUuid ? (routersMap.get(routerUuid) || '') : '';
    const msUuid = el.getAttribute('messageserverid') || '';
    const msInfo = msUuid ? msgServersMap.get(msUuid) : undefined;
    const group = el.getAttribute('group') || '';

    const env = guessEnvironment(name, sid);

    const system: SapSystem = {
      id: `imported-${Date.now()}-${index}`,
      name: name,
      sid: sid.toUpperCase(),
      description: el.getAttribute('description') || `${sid} 系统 (${server || 'Message Server'})`,
      env: env,
      connectionType: msInfo ? 'group' : 'custom',
      server: server || (msInfo ? msInfo.host : ''),
      instanceNumber: systemNumber,
      client: client,
      language: language,
      messageServer: msInfo ? msInfo.host : undefined,
      group: group || undefined,
      sapRouter: routerStr || undefined,
      accounts: [
        {
          id: `acc-${Date.now()}-${index}-1`,
          alias: '默认账号',
          username: '',
          password: '',
          isDefault: true,
          autoLogin: true,
        }
      ],
      tags: [env === 'PRD' ? '生产系统' : env === 'DEV' ? '开发系统' : '测试系统'],
      isFavorite: false,
      loginCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    systems.push(system);
  });

  return systems;
}

/**
 * 解析经典 saplogon.ini 文件内容
 */
export function parseSapLogonIni(iniContent: string): SapSystem[] {
  const lines = iniContent.split(/\r?\n/);
  const systems: SapSystem[] = [];
  const entries: Record<string, Record<string, string>> = {};
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1);
      if (!entries[currentSection]) entries[currentSection] = {};
    } else if (currentSection && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      entries[currentSection][key] = val;
    }
  }

  // 常见 saplogon.ini 格式包含 [Server], [Description], [MSSysName] 等
  const descriptions = entries['Description'] || {};
  const servers = entries['Server'] || {};
  const routers = entries['Router'] || {};
  const msSysNames = entries['MSSysName'] || {};

  const keys = Object.keys(descriptions);
  keys.forEach((key, idx) => {
    const name = descriptions[key] || `SAP ${key}`;
    const serverVal = servers[key] || '';
    const routerVal = routers[key] || '';
    const sid = msSysNames[key] || name.slice(0, 3).toUpperCase();
    
    // serverVal 可能形如 "192.168.1.100 00"
    let server = serverVal;
    let inst = '00';
    if (serverVal.includes(' ')) {
      const parts = serverVal.split(' ');
      server = parts[0];
      inst = parts[1] || '00';
    }

    const env = guessEnvironment(name, sid);

    systems.push({
      id: `ini-${Date.now()}-${idx}`,
      name: name,
      sid: sid.toUpperCase(),
      description: name,
      env: env,
      connectionType: 'custom',
      server: server,
      instanceNumber: inst,
      client: '800',
      language: 'ZH',
      sapRouter: routerVal || undefined,
      accounts: [
        {
          id: `acc-ini-${idx}`,
          alias: '默认账号',
          username: '',
          password: '',
          isDefault: true,
          autoLogin: true,
        }
      ],
      tags: ['SAPLogon导入'],
      isFavorite: false,
      loginCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  return systems;
}

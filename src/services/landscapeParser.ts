import { SapSystem, EnvironmentType, SapAccount } from '../types/sap';

/**
 * SAPUILandscape.xml / SAPGUILandscape.xml 与 saplogon.ini 高级导入解析器
 */

function guessEnvironment(name: string, sid: string): EnvironmentType {
  const upper = `${name} ${sid}`.toUpperCase();
  if (upper.includes('PRD') || upper.includes('PROD') || upper.includes('生产') || upper.includes('PS4') || upper.includes('S4P')) return 'PRD';
  if (upper.includes('QAS') || upper.includes('QA') || upper.includes('TEST') || upper.includes('测试') || upper.includes('UAT') || upper.includes('QS4') || upper.includes('S4Q')) return 'QAS';
  if (upper.includes('DEV') || upper.includes('开发') || upper.includes('DEVELOP') || upper.includes('DS4') || upper.includes('S4D')) return 'DEV';
  if (upper.includes('SBX') || upper.includes('SAND') || upper.includes('沙箱') || upper.includes('TRAIN') || upper.includes('S4X') || upper.includes('POC')) return 'SBX';
  return 'OTHER';
}

function extractSid(name: string, systemidAttr?: string | null): string {
  if (systemidAttr && systemidAttr.trim()) return systemidAttr.trim().toUpperCase();
  
  // 常见命名模式，例如 SUNNY_S4D -> S4D, KRB-S4P-krb123 -> S4P, 天通S4D -> S4D, PS4 -> PS4, DS4 -> DS4
  const patterns = [
    /[_-](S4[DQPXS]|\w{3})[_-]/i,
    /(S4[DQPXS]|BW[DQP]|EC[DQP]|ER[DQP])/i,
    /(PS4|QS4|DS4|TS4|SS4)/i,
    /[A-Z0-9]{3}/,
  ];

  for (const p of patterns) {
    const match = name.match(p);
    if (match) {
      return (match[1] || match[0]).toUpperCase();
    }
  }

  // 取名称前3个有效字符
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned.slice(0, 3).toUpperCase() || 'SAP';
}

/**
 * 解析 SAPUILandscape.xml / SAPGUILandscape.xml 文件内容
 */
export function parseSapLandscapeXml(xmlContent: string): SapSystem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  const systems: SapSystem[] = [];

  // 1. 获取 Router 字典
  const routersMap = new Map<string, string>();
  const routerElements = doc.querySelectorAll('Routers > Router');
  routerElements.forEach(el => {
    const uuid = el.getAttribute('uuid') || '';
    const routerStr = el.getAttribute('router') || '';
    if (uuid && routerStr) routersMap.set(uuid, routerStr);
  });

  // 2. 获取 MessageServers 字典
  const msgServersMap = new Map<string, { host: string; port?: string }>();
  const msgElements = doc.querySelectorAll('Messageservers > Messageserver');
  msgElements.forEach(el => {
    const uuid = el.getAttribute('uuid') || '';
    const host = el.getAttribute('host') || '';
    const port = el.getAttribute('port') || '';
    if (uuid && host) msgServersMap.set(uuid, { host, port });
  });

  // 3. 获取 Workspaces / Nodes (工作区与分组节点，用于提取分类与标签)
  // serviceId -> 节点名称列表（如 "诺贝尔", "KRB", "舜宇"）
  const serviceCategoriesMap = new Map<string, string[]>();
  const nodeElements = doc.querySelectorAll('Workspaces Node');
  nodeElements.forEach(node => {
    const nodeName = node.getAttribute('name') || '';
    if (nodeName) {
      const items = node.querySelectorAll('Item');
      items.forEach(item => {
        const srvId = item.getAttribute('serviceid') || '';
        if (srvId) {
          const list = serviceCategoriesMap.get(srvId) || [];
          if (!list.includes(nodeName)) {
            list.push(nodeName);
          }
          serviceCategoriesMap.set(srvId, list);
        }
      });
    }
  });

  // 4. 解析 Services / Connections
  const serviceElements = doc.querySelectorAll('Services > Service');
  serviceElements.forEach((el, index) => {
    const uuid = el.getAttribute('uuid') || `service-${index}`;
    const name = el.getAttribute('name') || `SAP System ${index + 1}`;
    const systemIdAttr = el.getAttribute('systemid') || el.getAttribute('sid');
    const sid = extractSid(name, systemIdAttr);

    let rawServer = el.getAttribute('server') || el.getAttribute('ip') || '';
    let instanceNumber = el.getAttribute('systemnumber') || el.getAttribute('instancenumber') || '';
    
    // 解析形如 "192.168.44.220:3200" 的服务器与端口
    let server = rawServer;
    if (rawServer.includes(':')) {
      const parts = rawServer.split(':');
      server = parts[0];
      const port = parts[1];
      if (!instanceNumber && port && port.startsWith('32')) {
        instanceNumber = port.slice(2);
      }
    }
    if (!instanceNumber) instanceNumber = '00';

    const client = el.getAttribute('client') || '800';
    const language = el.getAttribute('language') || 'ZH';
    const userAttr = el.getAttribute('user') || '';
    
    const routerUuid = el.getAttribute('routerid') || '';
    const routerStr = routerUuid ? (routersMap.get(routerUuid) || '') : '';
    
    const msUuid = el.getAttribute('messageserverid') || '';
    const msInfo = msUuid ? msgServersMap.get(msUuid) : undefined;
    const group = el.getAttribute('group') || '';

    const env = guessEnvironment(name, sid);

    // 标签提取 (来自工作区分组及环境)
    const nodeTags = serviceCategoriesMap.get(uuid) || [];
    const tags: string[] = [];
    if (nodeTags.length > 0) {
      tags.push(...nodeTags);
    }
    if (env === 'PRD' && !tags.includes('生产系统')) tags.push('生产系统');
    if (env === 'DEV' && !tags.includes('开发系统')) tags.push('开发系统');
    if (env === 'QAS' && !tags.includes('测试系统')) tags.push('测试系统');

    // 账号信息提取
    const accounts: SapAccount[] = [
      {
        id: `acc-${Date.now()}-${index}-1`,
        alias: userAttr ? `${userAttr} (配置账号)` : '日常账号',
        username: userAttr || '',
        password: '',
        isDefault: true,
        autoLogin: true,
        note: `从 SAP GUI 配置 (${name}) 自动同步`,
      }
    ];

    const system: SapSystem = {
      id: `imported-${Date.now()}-${index}`,
      name: name,
      sid: sid.toUpperCase(),
      description: `${name} | Client ${client} | 服务器: ${server || 'MessageServer'}`,
      env: env,
      connectionType: msInfo ? 'group' : 'custom',
      server: server || (msInfo ? msInfo.host : ''),
      instanceNumber: instanceNumber,
      client: client,
      language: language,
      messageServer: msInfo ? msInfo.host : undefined,
      group: group || undefined,
      sapRouter: routerStr || undefined,
      accounts: accounts,
      activeAccountId: accounts[0].id,
      tags: tags,
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

  const descriptions = entries['Description'] || {};
  const servers = entries['Server'] || {};
  const routers = entries['Router'] || {};
  const msSysNames = entries['MSSysName'] || {};

  const keys = Object.keys(descriptions);
  keys.forEach((key, idx) => {
    const name = descriptions[key] || `SAP ${key}`;
    const serverVal = servers[key] || '';
    const routerVal = routers[key] || '';
    const sid = extractSid(name, msSysNames[key]);
    
    let server = serverVal;
    let inst = '00';
    if (serverVal.includes(' ')) {
      const parts = serverVal.split(' ');
      server = parts[0];
      inst = parts[1] || '00';
    } else if (serverVal.includes(':')) {
      const parts = serverVal.split(':');
      server = parts[0];
      inst = parts[1].slice(2) || '00';
    }

    const env = guessEnvironment(name, sid);

    const accounts: SapAccount[] = [
      {
        id: `acc-ini-${idx}`,
        alias: '默认账号',
        username: '',
        password: '',
        isDefault: true,
        autoLogin: true,
      }
    ];

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
      accounts: accounts,
      activeAccountId: accounts[0].id,
      tags: ['SAPLogon导入'],
      isFavorite: false,
      loginCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  return systems;
}

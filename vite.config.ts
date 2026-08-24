import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import os from 'os';

// 智能解码二进制 Buffer，支持 UTF-8, GBK, GB2312, GB18030, UTF-16LE
function decodeSmartBuffer(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) return '';

  // 1. BOM 检查
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.subarray(3).toString('utf-8');
  }
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(buffer.subarray(2));
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(buffer.subarray(2));
  }

  // 2. 检查 XML 声明编码
  const headAscii = buffer.subarray(0, Math.min(200, buffer.length)).toString('binary');
  const encMatch = headAscii.match(/encoding=["']([^"']+)["']/i);
  if (encMatch && encMatch[1]) {
    const declaredEnc = encMatch[1].toLowerCase().trim();
    if (['gbk', 'gb2312', 'gb18030', 'cp936'].includes(declaredEnc)) {
      try {
        return new TextDecoder('gb18030').decode(buffer);
      } catch {}
    } else if (['utf-16', 'utf-16le'].includes(declaredEnc)) {
      try {
        return new TextDecoder('utf-16le').decode(buffer);
      } catch {}
    }
  }

  // 3. 严格 UTF-8 校验
  try {
    const strictUtf8 = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return strictUtf8;
  } catch {
    // UTF-8 校验失败，说明是 GBK / ANSI 编码
  }

  // 4. 尝试 GB18030 (超集兼容 GBK, GB2312)
  try {
    return new TextDecoder('gb18030').decode(buffer);
  } catch {}

  // 5. 默认返回 UTF-8
  return buffer.toString('utf-8');
}

// 扫描并发现本地系统中的 SAP 配置文件
function scanLocalSapFiles() {
  const home = os.homedir();
  const appData = process.env.APPDATA || '';
  const userProfile = process.env.USERPROFILE || home;

  const candidatePaths = [
    // macOS 常见路径 (SAP GUI for Java)
    path.join(home, 'Library/Preferences/SAP/SAPGUILandscape.xml'),
    path.join(home, 'Library/Preferences/SAP/SAPUILandscape.xml'),
    path.join(home, 'Library/Preferences/SAP/SAPUILandscapeGlobal.xml'),
    path.join(home, 'Library/Preferences/SAP/settings'),
    path.join(home, '.SAPGUI/SAPGUILandscape.xml'),
    path.join(home, '.SAPGUI/settings'),
    // Windows 常见路径 (SAP GUI for Windows)
    path.join(appData, 'SAP/Common/SAPUILandscape.xml'),
    path.join(appData, 'SAP/Common/SAPGUILandscape.xml'),
    path.join(appData, 'SAP/Common/SAPUILandscapeGlobal.xml'),
    path.join(appData, 'SAP/Common/saplogon.ini'),
    path.join(appData, 'SAP/Common/sapshortcut.ini'),
    path.join(userProfile, 'AppData/Roaming/SAP/Common/SAPUILandscape.xml'),
    path.join(userProfile, 'AppData/Roaming/SAP/Common/saplogon.ini'),
  ];

  const foundFiles: Array<{ path: string; name: string; type: string; size: number; content: string }> = [];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        const rawBuffer = fs.readFileSync(p);
        const content = decodeSmartBuffer(rawBuffer);
        const ext = path.extname(p).toLowerCase();
        let type = 'unknown';
        if (ext === '.xml' || content.includes('<Landscape')) type = 'landscape_xml';
        else if (ext === '.ini' || content.includes('[Description]')) type = 'logon_ini';
        else if (p.endsWith('settings')) type = 'sap_settings';

        foundFiles.push({
          path: p,
          name: path.basename(p),
          type,
          size: fs.statSync(p).size,
          content,
        });
      }
    } catch {
      // 忽略无法读取的路径
    }
  }

  // 扫描桌面和下载文件夹中的 .sap 快捷方式文件
  const shortcutFolders = [
    path.join(home, 'Desktop'),
    path.join(home, 'Downloads'),
    path.join(home, 'Desktop/SAP_Shortcuts'),
  ];

  const foundShortcuts: Array<{ path: string; filename: string; content: string }> = [];

  for (const folder of shortcutFolders) {
    try {
      if (fs.existsSync(folder) && fs.statSync(folder).isDirectory()) {
        const files = fs.readdirSync(folder);
        for (const file of files) {
          if (file.toLowerCase().endsWith('.sap')) {
            const fullPath = path.join(folder, file);
            try {
              const rawBuffer = fs.readFileSync(fullPath);
              const content = decodeSmartBuffer(rawBuffer);
              foundShortcuts.push({
                path: fullPath,
                filename: file,
                content,
              });
            } catch {}
          }
        }
      }
    } catch {}
  }

  return { foundFiles, foundShortcuts, osPlatform: os.platform() };
}

// 自动扫描与快捷方式后端中间件插件
function sapAutoScanPlugin() {
  return {
    name: 'sap-auto-scan-middleware',
    configureServer(server: any) {
      // 1. 自动扫描本地 SAP 配置接口
      server.middlewares.use('/api/auto-scan-sap', (req: any, res: any, next: any) => {
        if (req.method === 'GET') {
          try {
            const result = scanLocalSapFiles();
            const jsonBody = JSON.stringify({ success: true, ...result });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(Buffer.from(jsonBody, 'utf-8'));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(Buffer.from(JSON.stringify({ success: false, error: e.message }), 'utf-8'));
          }
        } else {
          next();
        }
      });

      // 2. 批量将快捷方式 (.sap) 导出生成到桌面接口
      server.middlewares.use('/api/generate-desktop-shortcuts', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const { shortcuts, targetDir } = JSON.parse(body || '{}');
              const home = os.homedir();
              const destDir = targetDir || path.join(home, 'Desktop/SAP_Shortcuts');
              
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
              }

              const savedList: string[] = [];
              if (Array.isArray(shortcuts)) {
                for (const item of shortcuts) {
                  if (item.filename && item.content) {
                    const filePath = path.join(destDir, item.filename);
                    fs.writeFileSync(filePath, item.content, 'utf-8');
                    savedList.push(filePath);
                  }
                }
              }

              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(Buffer.from(JSON.stringify({ success: true, destDir, savedFiles: savedList }), 'utf-8'));
            } catch (e: any) {
              res.statusCode = 500;
              res.end(Buffer.from(JSON.stringify({ success: false, error: e.message }), 'utf-8'));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), sapAutoScanPlugin()],
  server: {
    port: 5173,
    open: false,
  },
});

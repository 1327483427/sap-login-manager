import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Share2,
  Code,
  Zap,
  Play
} from 'lucide-react';
import { SapSystem } from '../types/sap';
import { 
  generateSapBatContent, 
  downloadSapBatFile, 
  generateSapshcutCommand, 
  generateMacSapGuiCommand,
  launchDirectSapshcut
} from '../services/sapShortcut';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: SapSystem | null;
  onShowToast?: (toast: { type: 'success' | 'info' | 'warning' | 'launch'; title: string; description?: string }) => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  onClose,
  system,
  onShowToast,
}) => {
  const [transaction, setTransaction] = useState('*SESSION_MANAGER');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  if (!isOpen || !system) return null;

  const activeAccount = 
    system.accounts.find(a => a.id === system.activeAccountId) || 
    system.accounts[0];

  const batContent = generateSapBatContent(system, activeAccount, { transaction });
  const windowsCmd = generateSapshcutCommand(system, activeAccount, { transaction });
  const macCmd = generateMacSapGuiCommand(system);

  const copyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDirectLaunch = async () => {
    setIsLaunching(true);
    try {
      const res = await launchDirectSapshcut(system, activeAccount, { transaction });
      if (onShowToast) {
        onShowToast({
          type: 'launch',
          title: `⚡ ${res.message || '已触发 SAP GUI 直接登录'}`,
          description: `系统: ${system.sid} | 账号: ${activeAccount?.username || '默认'}`,
        });
      }
    } catch (e: any) {
      if (onShowToast) {
        onShowToast({
          type: 'warning',
          title: '登录拉起异常',
          description: e.message,
        });
      }
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-2xl bg-[#141923] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                sapshcut 命令与 .bat 脚本 - {system.sid} ({system.name})
              </h2>
              <p className="text-xs text-slate-400">当前账号: {activeAccount?.username} | Client {system.client}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 主体 */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* 直达事务码 */}
          <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-slate-300 font-medium">
              直达事务码 (Transaction Code)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={transaction}
                onChange={(e) => setTransaction(e.target.value)}
                placeholder="例如: *SESSION_MANAGER 或 SE38 / SU01"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-400">
                默认进入 SAP 主菜单
              </span>
            </div>
          </div>

          {/* 选项 1: 直接唤起 CMD / sapshcut 登录（免下载） */}
          <div className="p-4 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl border border-blue-500/40 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-400 fill-current" />
                <span>直接在宿主机执行 sapshcut 登录（免下载）</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                通过本地后端服务直接运行命令行，免密无感拉起 SAP GUI
              </p>
            </div>
            <button
              onClick={handleDirectLaunch}
              disabled={isLaunching}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-blue-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLaunching ? '正在呼起...' : '立即呼起登录'}</span>
            </button>
          </div>

          {/* 选项 2: Windows sapshcut 完整命令行 */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Windows CMD 命令行命令 (sapshcut.exe)</span>
              </div>
              <button
                onClick={() => copyText(windowsCmd, 'win')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1"
              >
                {copiedType === 'win' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'win' ? '已复制' : '复制命令'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800 break-all select-all">
              {windowsCmd}
            </div>
          </div>

          {/* 选项 3: 生成 .bat 脚本 */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Code className="w-4 h-4 text-purple-400" />
                <span>.bat 独立批处理脚本</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyText(batContent, 'bat')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1"
                >
                  {copiedType === 'bat' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'bat' ? '已复制' : '复制脚本'}</span>
                </button>
                <button
                  onClick={() => downloadSapBatFile(system, activeAccount, { transaction })}
                  className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg border border-purple-500/30 text-xs flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>下载 .bat</span>
                </button>
              </div>
            </div>
            <pre className="p-2.5 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-400 overflow-x-auto border border-slate-800">
              {batContent}
            </pre>
          </div>

          {/* 选项 4: macOS 命令 */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>macOS SAP GUI for Java 启动命令</span>
              </div>
              <button
                onClick={() => copyText(macCmd, 'mac')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1"
              >
                {copiedType === 'mac' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'mac' ? '已复制' : '复制命令'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800 break-all">
              {macCmd}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

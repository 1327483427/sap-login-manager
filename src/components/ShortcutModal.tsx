import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  FileCode, 
  Share2,
  Code
} from 'lucide-react';
import { SapSystem } from '../types/sap';
import { 
  generateSapShortcutContent, 
  downloadSapShortcut, 
  generateSapshcutCommand, 
  generateMacSapGuiCommand 
} from '../services/sapShortcut';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: SapSystem | null;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  onClose,
  system,
}) => {
  const [transaction, setTransaction] = useState('*SESSION_MANAGER');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen || !system) return null;

  const activeAccount = 
    system.accounts.find(a => a.id === system.activeAccountId) || 
    system.accounts[0];

  const shortcutContent = generateSapShortcutContent(system, activeAccount, { transaction });
  const windowsCmd = generateSapshcutCommand(system, activeAccount);
  const macCmd = generateMacSapGuiCommand(system);

  const copyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-2xl bg-[#141923] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                快捷方式与命令行启动 - {system.sid} ({system.name})
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
          {/* 指定登录事务码 */}
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
                默认进入 SAP Easy Access 主菜单
              </span>
            </div>
          </div>

          {/* 选项 1: 下载 .sap 快捷方式文件 */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span>生成并下载 SAP 快捷文件 (.sap)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                生成官方标准快捷方式文件，双击即可由 SAP GUI 自动拉起并登录
              </p>
            </div>
            <button
              onClick={() => downloadSapShortcut(system, activeAccount, { transaction })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .sap</span>
            </button>
          </div>

          {/* 选项 2: Windows sapshcut 命令行 */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Windows 命令行直接调用 (sapshcut.exe)</span>
              </div>
              <button
                onClick={() => copyText(windowsCmd, 'win')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1"
              >
                {copiedType === 'win' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'win' ? '已复制' : '复制命令'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-850 break-all">
              {windowsCmd}
            </div>
          </div>

          {/* 选项 3: macOS SAP GUI for Java 命令 */}
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
            <div className="p-2.5 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-850 break-all">
              {macCmd}
            </div>
          </div>

          {/* 选项 4: .sap 文件源代码预览 */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                <Code className="w-4 h-4 text-purple-400" />
                <span>.sap 快捷方式文件源码预览</span>
              </span>
              <button
                onClick={() => copyText(shortcutContent, 'code')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1"
              >
                {copiedType === 'code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'code' ? '已复制源码' : '复制源码'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-400 overflow-x-auto border border-slate-850">
              {shortcutContent}
            </pre>
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

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Zap, 
  Copy, 
  User, 
  Check
} from 'lucide-react';
import { SapSystem, SapAccount, EnvironmentType } from '../types/sap';

interface QuickLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  systems: SapSystem[];
  onLaunch: (system: SapSystem, account?: SapAccount) => void;
  onCopyPassword: (password: string) => void;
}

const ENV_LABELS: Record<EnvironmentType, { label: string; class: string }> = {
  PRD: { label: 'PRD 生产', class: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  QAS: { label: 'QAS 测试', class: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  DEV: { label: 'DEV 开发', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  SBX: { label: 'SBX 沙箱', class: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  OTHER: { label: 'SYS 系统', class: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

export const QuickLauncher: React.FC<QuickLauncherProps> = ({
  isOpen,
  onClose,
  systems,
  onLaunch,
  onCopyPassword,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 过滤系统
  const filteredSystems = systems.filter((sys) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const matchSid = sys.sid.toLowerCase().includes(q);
    const matchName = sys.name.toLowerCase().includes(q);
    const matchServer = sys.server.toLowerCase().includes(q);
    const matchClient = sys.client.toLowerCase().includes(q);
    const matchEnv = sys.env.toLowerCase().includes(q);
    const matchTags = sys.tags?.some(t => t.toLowerCase().includes(q));
    const matchAccounts = sys.accounts.some(
      a => a.username.toLowerCase().includes(q) || (a.alias && a.alias.toLowerCase().includes(q))
    );
    return matchSid || matchName || matchServer || matchClient || matchEnv || matchTags || matchAccounts;
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // 键盘快捷键监听
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredSystems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredSystems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredSystems[selectedIndex]) {
          const target = filteredSystems[selectedIndex];
          const acc = target.accounts.find(a => a.id === target.activeAccountId) || target.accounts[0];
          onLaunch(target, acc);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredSystems, selectedIndex, onLaunch, onClose]);

  if (!isOpen) return null;

  const handleCopy = (sys: SapSystem) => {
    const acc = sys.accounts.find(a => a.id === sys.activeAccountId) || sys.accounts[0];
    if (acc?.password) {
      onCopyPassword(acc.password);
      setCopiedId(sys.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* 遮罩背景点击 */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[80vh]">
        {/* 顶部搜索框 */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="输入 SID、系统名、客户端、账号名，回车立即登录..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-400 text-sm font-medium outline-none"
          />
          <kbd className="px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded font-mono border border-slate-700">
            ESC 关闭
          </kbd>
        </div>

        {/* 结果列表 */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1 max-h-96">
          {filteredSystems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              没有找到匹配的 SAP 系统连接
            </div>
          ) : (
            filteredSystems.map((sys, idx) => {
              const isSelected = idx === selectedIndex;
              const envCfg = ENV_LABELS[sys.env] || ENV_LABELS.OTHER;
              const acc = sys.accounts.find(a => a.id === sys.activeAccountId) || sys.accounts[0];

              return (
                <div
                  key={sys.id}
                  onClick={() => {
                    onLaunch(sys, acc);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0 font-mono">
                      <span className="font-bold text-xs text-white">{sys.sid}</span>
                      <span className="text-[9px] text-slate-400">#{sys.instanceNumber || '00'}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-100 truncate">
                          {sys.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${envCfg.class}`}>
                          {envCfg.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Clnt {sys.client}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <User className="w-3 h-3 text-blue-400" />
                          <span>{acc?.username || '未配置'}</span>
                          {acc?.alias && <span>({acc.alias})</span>}
                        </span>
                        <span className="truncate max-w-[180px] font-mono text-slate-400">
                          {sys.server}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {acc?.password && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(sys);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs flex items-center gap-1"
                        title="复制密码"
                      >
                        {copiedId === sys.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {isSelected && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm animate-pulse">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>回车登录</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部键盘导航提示 */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↓</kbd>
              <span>选择</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">Enter</kbd>
              <span>一键登录</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>共 {filteredSystems.length} 个匹配系统</span>
          </div>
        </div>
      </div>
    </div>
  );
};

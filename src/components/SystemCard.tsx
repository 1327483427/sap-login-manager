import React, { useState } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Star, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  User, 
  Server, 
  Network, 
  Share2,
  Lock,
  Terminal
} from 'lucide-react';
import { SapSystem, SapAccount, EnvironmentType } from '../types/sap';
import { downloadSapBatFile } from '../services/sapShortcut';

interface SystemCardProps {
  system: SapSystem;
  onLaunch: (system: SapSystem, account?: SapAccount) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (system: SapSystem) => void;
  onDelete: (id: string) => void;
  onSelectAccount: (systemId: string, accountId: string) => void;
  onCopyPassword: (password: string) => void;
  onOpenShortcutModal: (system: SapSystem) => void;
}

const ENV_CONFIGS: Record<EnvironmentType, { label: string; badgeClass: string; borderClass: string; dotColor: string }> = {
  PRD: {
    label: '生产 PRD',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    borderClass: 'hover:border-rose-500/50',
    dotColor: 'bg-rose-500',
  },
  QAS: {
    label: '测试 QAS',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    borderClass: 'hover:border-sky-500/50',
    dotColor: 'bg-sky-400',
  },
  DEV: {
    label: '开发 DEV',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    borderClass: 'hover:border-emerald-500/50',
    dotColor: 'bg-emerald-400',
  },
  SBX: {
    label: '沙箱 SBX',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    borderClass: 'hover:border-purple-500/50',
    dotColor: 'bg-purple-400',
  },
  OTHER: {
    label: '系统 SYS',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    borderClass: 'hover:border-slate-500/50',
    dotColor: 'bg-slate-400',
  },
};

export const SystemCard: React.FC<SystemCardProps> = ({
  system,
  onLaunch,
  onToggleFavorite,
  onEdit,
  onDelete,
  onSelectAccount,
  onCopyPassword,
  onOpenShortcutModal,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const envConfig = ENV_CONFIGS[system.env] || ENV_CONFIGS.OTHER;

  const activeAccount = 
    system.accounts.find(a => a.id === system.activeAccountId) || 
    system.accounts.find(a => a.isDefault) || 
    system.accounts[0];

  const handleCopy = () => {
    if (activeAccount?.password) {
      onCopyPassword(activeAccount.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`glass-card rounded-2xl p-5 flex flex-col justify-between relative group ${envConfig.borderClass}`}>
      {/* 卡片头部 */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* SID 大标签 */}
            <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700/80 flex flex-col items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition">
              <span className="font-extrabold text-sm tracking-wider text-white font-mono">{system.sid}</span>
              <span className="text-[9px] text-slate-400 font-mono">#{system.instanceNumber || '00'}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${envConfig.badgeClass} flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${envConfig.dotColor}`}></span>
                  {envConfig.label}
                </span>
                <span className="text-xs text-slate-400 font-mono">Client {system.client}</span>
              </div>
              <h3 className="font-bold text-sm text-slate-100 truncate mt-1" title={system.name}>
                {system.name}
              </h3>
            </div>
          </div>

          {/* 右上角操作 (收藏 & 菜单) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggleFavorite(system.id)}
              className={`p-1.5 rounded-lg transition ${
                system.isFavorite 
                  ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={system.isFavorite ? '取消收藏' : '加入收藏'}
            >
              <Star className={`w-4 h-4 ${system.isFavorite ? 'fill-amber-400' : ''}`} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl z-50 py-1 text-xs">
                    <button
                      onClick={() => { setShowMenu(false); onEdit(system); }}
                      className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>编辑连接</span>
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onOpenShortcutModal(system); }}
                      className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>快捷命令选项</span>
                    </button>
                    <div className="h-px bg-slate-800 my-1" />
                    <button
                      onClick={() => { setShowMenu(false); onDelete(system.id); }}
                      className="w-full px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>删除系统</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 描述与网络连接参数 */}
        {system.description && (
          <p className="text-xs text-slate-400 line-clamp-1 mb-3">
            {system.description}
          </p>
        )}

        <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80 space-y-1.5 text-xs text-slate-300 mb-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>{system.connectionType === 'group' ? '组/服务' : '服务器'}</span>
            </span>
            <span className="text-slate-200 truncate max-w-[160px]" title={system.server}>
              {system.server}
            </span>
          </div>

          {system.sapRouter && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-400/80 flex items-center gap-1">
                <Network className="w-3 h-3" />
                <span>Router</span>
              </span>
              <span className="text-slate-400 truncate max-w-[150px]" title={system.sapRouter}>
                已配置穿透
              </span>
            </div>
          )}
        </div>

        {/* 账号与密码选择区 */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold">{activeAccount?.username || '未配置账号'}</span>
              {activeAccount?.alias && (
                <span className="text-[11px] text-slate-400 font-normal">({activeAccount.alias})</span>
              )}
            </div>

            {/* 多账号切换 */}
            {system.accounts.length > 1 && (
              <select
                value={activeAccount?.id}
                onChange={(e) => onSelectAccount(system.id, e.target.value)}
                className="bg-slate-800 text-[11px] text-slate-300 border border-slate-700 rounded-lg px-2 py-0.5 outline-none cursor-pointer hover:border-slate-600"
              >
                {system.accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.username} {acc.alias ? `(${acc.alias})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 密码展示与快捷复制 */}
          <div className="flex items-center justify-between bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3 text-slate-400" />
              <span className="font-mono text-slate-300">
                {showPassword 
                  ? (activeAccount?.password || '无密码') 
                  : (activeAccount?.password ? '••••••••••••' : '无密码')}
              </span>
            </div>

            {activeAccount?.password && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-200 transition"
                  title={showPassword ? '隐藏密码' : '显示明文'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleCopy}
                  className={`p-1 transition flex items-center gap-0.5 text-[11px] ${
                    copied ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="复制密码 (30秒后自动清理剪贴板)"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 卡片底部操作按钮 */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* 一键直接呼起 CMD/sapshcut 登录（免下载） */}
          <button
            onClick={() => onLaunch(system, activeAccount)}
            className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition"
            title="直接通过 sapshcut / CMD 唤起 SAP GUI 登录（免密直连）"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>一键直接登录</span>
          </button>

          {/* 备用：下载 .bat 批处理文件 */}
          <button
            onClick={() => downloadSapBatFile(system, activeAccount)}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition flex items-center gap-1"
            title="下载 .bat 批处理快捷方式文件"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>.bat</span>
          </button>
        </div>

        {/* 标签 */}
        {system.tags && system.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {system.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/50">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

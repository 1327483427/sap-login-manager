import React, { useState } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  Star, 
  Edit3, 
  Trash2, 
  User,
  Share2,
  Terminal
} from 'lucide-react';
import { SapSystem, SapAccount, EnvironmentType } from '../types/sap';
import { downloadSapBatFile } from '../services/sapShortcut';

interface SystemListItemProps {
  system: SapSystem;
  onLaunch: (system: SapSystem, account?: SapAccount) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (system: SapSystem) => void;
  onDelete: (id: string) => void;
  onSelectAccount: (systemId: string, accountId: string) => void;
  onCopyPassword: (password: string) => void;
  onOpenShortcutModal: (system: SapSystem) => void;
}

const ENV_CONFIGS: Record<EnvironmentType, { label: string; badgeClass: string; dotColor: string }> = {
  PRD: { label: 'PRD', badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30', dotColor: 'bg-rose-500' },
  QAS: { label: 'QAS', badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30', dotColor: 'bg-sky-400' },
  DEV: { label: 'DEV', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dotColor: 'bg-emerald-400' },
  SBX: { label: 'SBX', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30', dotColor: 'bg-purple-400' },
  OTHER: { label: 'SYS', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30', dotColor: 'bg-slate-400' },
};

export const SystemListItem: React.FC<SystemListItemProps> = ({
  system,
  onLaunch,
  onToggleFavorite,
  onEdit,
  onDelete,
  onSelectAccount,
  onCopyPassword,
  onOpenShortcutModal,
}) => {
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
    <tr className="hover:bg-slate-800/40 border-b border-slate-800/60 transition group text-xs text-slate-300">
      {/* 收藏 */}
      <td className="py-3.5 pl-4 pr-2 w-8">
        <button
          onClick={() => onToggleFavorite(system.id)}
          className={`p-1 rounded transition ${
            system.isFavorite 
              ? 'text-amber-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${system.isFavorite ? 'fill-amber-400' : ''}`} />
        </button>
      </td>

      {/* SID & 环境 */}
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] border ${envConfig.badgeClass}`}>
            {system.sid}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">#{system.instanceNumber || '00'}</span>
        </div>
      </td>

      {/* 系统名称与描述 */}
      <td className="py-3.5 px-3 max-w-[220px]">
        <div className="font-semibold text-slate-100 truncate" title={system.name}>
          {system.name}
        </div>
        {system.description && (
          <div className="text-[11px] text-slate-400 truncate" title={system.description}>
            {system.description}
          </div>
        )}
      </td>

      {/* 服务器地址 */}
      <td className="py-3.5 px-3 font-mono text-slate-300 truncate max-w-[180px]" title={system.server}>
        {system.server}
      </td>

      {/* Client 客户端 */}
      <td className="py-3.5 px-3 font-mono font-medium text-slate-200">
        {system.client}
      </td>

      {/* 账号与切换 */}
      <td className="py-3.5 px-3 min-w-[160px]">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          {system.accounts.length > 1 ? (
            <select
              value={activeAccount?.id}
              onChange={(e) => onSelectAccount(system.id, e.target.value)}
              className="bg-slate-800/80 text-[11px] text-slate-200 border border-slate-700 rounded-md px-1.5 py-0.5 outline-none"
            >
              {system.accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.username} {acc.alias ? `(${acc.alias})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-mono font-semibold text-slate-200">
              {activeAccount?.username || '-'}
            </span>
          )}
        </div>
      </td>

      {/* 密码快捷复制 */}
      <td className="py-3.5 px-3">
        {activeAccount?.password ? (
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700 hover:border-slate-600'
            }`}
            title="复制密码"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span className="text-[10px]">{copied ? '已复制' : '复制密码'}</span>
          </button>
        ) : (
          <span className="text-slate-400 text-[11px]">无</span>
        )}
      </td>

      {/* 快捷登录与操作 */}
      <td className="py-3.5 pr-4 pl-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onLaunch(system, activeAccount)}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
            title="直接通过 sapshcut 唤起 SAP 登录"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>直接登录</span>
          </button>

          <button
            onClick={() => downloadSapBatFile(system, activeAccount)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition"
            title="下载 .bat 批处理文件"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onOpenShortcutModal(system)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition"
            title="查看 .bat / sapshcut 脚本命令"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onEdit(system)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="编辑系统"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(system.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="删除系统"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

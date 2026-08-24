import React from 'react';
import { 
  Star, 
  ShieldCheck, 
  Layers, 
  Tag, 
  RotateCcw,
  Zap,
  FolderSync
} from 'lucide-react';
import { SapSystem } from '../types/sap';

interface SidebarProps {
  systems: SapSystem[];
  activeCategory: string; // 'ALL' | 'FAVORITES' | 'PRD' | 'QAS' | 'DEV' | 'SBX' | tag
  onSelectCategory: (cat: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onResetDefaultData: () => void;
  onOpenAutoScan: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  systems,
  activeCategory,
  onSelectCategory,
  selectedTag,
  onSelectTag,
  onResetDefaultData,
  onOpenAutoScan,
}) => {
  // 统计各分类数量
  const countAll = systems.length;
  const countFav = systems.filter(s => s.isFavorite).length;
  const countPrd = systems.filter(s => s.env === 'PRD').length;
  const countQas = systems.filter(s => s.env === 'QAS').length;
  const countDev = systems.filter(s => s.env === 'DEV').length;
  const countSbx = systems.filter(s => s.env === 'SBX').length;

  // 提取所有不重复标签
  const allTags = Array.from(new Set(systems.flatMap(s => s.tags || [])));

  return (
    <aside className="w-64 bg-[#111620] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none h-screen sticky top-0">
      {/* 顶部 Brand 标志 */}
      <div>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 flex items-center gap-1.5 tracking-wide">
              SAP Quick Logon
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">v1.0 • 快捷登录管家</p>
          </div>
        </div>

        {/* 分类菜单 */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-230px)]">
          {/* 自动读取本地配置入口 */}
          <div>
            <button
              onClick={onOpenAutoScan}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 hover:from-blue-600/25 hover:to-purple-600/25 border border-blue-500/30 text-blue-400 hover:text-blue-300 transition text-xs font-semibold group shadow-sm"
            >
              <div className="flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-blue-400 group-hover:rotate-180 transition duration-500" />
                <span>自动读取本地配置</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                自动
              </span>
            </button>
          </div>

          {/* 环境分类 */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              系统环境分类
            </div>

            {/* 全部 */}
            <button
              onClick={() => { onSelectCategory('ALL'); onSelectTag(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeCategory === 'ALL' && !selectedTag
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>全部系统</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-semibold">
                {countAll}
              </span>
            </button>

            {/* 常用收藏 */}
            <button
              onClick={() => { onSelectCategory('FAVORITES'); onSelectTag(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeCategory === 'FAVORITES' && !selectedTag
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>常用收藏</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-semibold">
                {countFav}
              </span>
            </button>

            {/* 生产环境 PRD */}
            <button
              onClick={() => { onSelectCategory('PRD'); onSelectTag(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeCategory === 'PRD' && !selectedTag
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
                <span>生产系统 (PRD)</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-semibold">
                {countPrd}
              </span>
            </button>

            {/* 测试环境 QAS */}
            <button
              onClick={() => { onSelectCategory('QAS'); onSelectTag(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeCategory === 'QAS' && !selectedTag
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50"></span>
                <span>测试系统 (QAS)</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-semibold">
                {countQas}
              </span>
            </button>

            {/* 开发环境 DEV */}
            <button
              onClick={() => { onSelectCategory('DEV'); onSelectTag(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeCategory === 'DEV' && !selectedTag
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                <span>开发系统 (DEV)</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-semibold">
                {countDev}
              </span>
            </button>

            {/* 沙箱环境 SBX */}
            <button
              onClick={() => { onSelectCategory('SBX'); onSelectTag(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                activeCategory === 'SBX' && !selectedTag
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50"></span>
                <span>沙箱系统 (SBX)</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-semibold">
                {countSbx}
              </span>
            </button>
          </div>

          {/* 标签过滤 */}
          {allTags.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>业务标签</span>
                {selectedTag && (
                  <button
                    onClick={() => onSelectTag(null)}
                    className="text-[10px] text-blue-400 hover:underline normal-case"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 px-2">
                {allTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => onSelectTag(isSelected ? null : tag)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800/70 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 border border-slate-700/50'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部保管箱安全状态与工具栏 */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 space-y-2">
        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-slate-200 flex items-center gap-1">
              <span>凭据保管箱</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">AES-256 加密保护</p>
          </div>
        </div>

        <button
          onClick={onResetDefaultData}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition rounded-lg hover:bg-slate-800/50"
          title="重置为演示示例数据"
        >
          <RotateCcw className="w-3 h-3" />
          <span>恢复默认示例数据</span>
        </button>
      </div>
    </aside>
  );
};

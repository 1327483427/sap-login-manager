import React from 'react';
import { 
  Search, 
  Plus, 
  UploadCloud, 
  Download, 
  LayoutGrid, 
  List, 
  Command,
  Zap
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onOpenNewConnection: () => void;
  onOpenImport: () => void;
  onExportBackup: () => void;
  onOpenQuickLauncher: () => void;
  onOpenAutoScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenNewConnection,
  onOpenImport,
  onExportBackup,
  onOpenQuickLauncher,
  onOpenAutoScan,
}) => {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <header className="h-16 px-6 glass-panel border-b border-slate-800/80 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* 搜索与 Spotlight 快速触发器 */}
      <div className="flex-1 max-w-xl relative flex items-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索 SAP 系统 (SID、名称、主机、客户端、账号、标签)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-24 py-2 bg-slate-900/90 hover:bg-slate-900 focus:bg-slate-900 border border-slate-700/70 focus:border-blue-500 rounded-xl text-sm text-slate-100 placeholder-slate-400 outline-none transition-all shadow-inner"
          />
          <button
            onClick={onOpenQuickLauncher}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono border border-slate-700 hover:border-slate-600 transition"
            title="快捷启动 (Cmd+K)"
          >
            {isMac ? <Command className="w-3 h-3" /> : 'Ctrl+'}K
          </button>
        </div>
      </div>

      {/* 右侧动作操作区 */}
      <div className="flex items-center gap-2.5">
        {/* 自动读取本地 SAP 配置与快捷方式 */}
        <button
          onClick={onOpenAutoScan}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-400 hover:text-blue-300 rounded-xl text-xs font-semibold border border-blue-500/40 transition shadow-sm active:scale-95"
          title="自动扫描本地 SAP GUI 配置文件与快捷方式并生成连接"
        >
          <Zap className="w-3.5 h-3.5 fill-current text-blue-400 animate-pulse" />
          <span className="hidden sm:inline">自动读取本地配置</span>
        </button>

        {/* 视图切换 (卡片 / 列表) */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              viewMode === 'grid'
                ? 'bg-blue-600/90 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="网格卡片视图"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              viewMode === 'table'
                ? 'bg-blue-600/90 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="列表详细视图"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* 导入 Landscape.xml */}
        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white rounded-xl text-xs font-medium border border-slate-700/80 transition shadow-sm"
          title="手动导入 SAPUILandscape.xml 或 saplogon.ini"
        >
          <UploadCloud className="w-4 h-4 text-blue-400" />
          <span className="hidden md:inline">导入</span>
        </button>

        {/* 备份导出 */}
        <button
          onClick={onExportBackup}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white rounded-xl text-xs font-medium border border-slate-700/80 transition shadow-sm"
          title="导出当前配置与保管箱备份"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">备份</span>
        </button>

        {/* 新建系统连接 */}
        <button
          onClick={onOpenNewConnection}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>新建连接</span>
        </button>
      </div>
    </header>
  );
};

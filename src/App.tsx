import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SystemCard } from './components/SystemCard';
import { SystemListItem } from './components/SystemListItem';
import { QuickLauncher } from './components/QuickLauncher';
import { ConnectionModal } from './components/ConnectionModal';
import { LandscapeImportModal } from './components/LandscapeImportModal';
import { ShortcutModal } from './components/ShortcutModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { SapSystem, SapAccount } from './types/sap';
import { 
  loadSystemsFromStorage, 
  saveSystemsToStorage, 
  exportBackupJson 
} from './services/storage';
import { downloadSapShortcut } from './services/sapShortcut';
import { copyToClipboardWithTimeout } from './services/crypto';
import { DEFAULT_SAP_SYSTEMS } from './mock/defaultSystems';
import { Server, Plus, UploadCloud } from 'lucide-react';

export const App: React.FC = () => {
  const [systems, setSystems] = useState<SapSystem[]>(() => loadSystemsFromStorage());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // 模态框状态
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SapSystem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [shortcutSystem, setShortcutSystem] = useState<SapSystem | null>(null);
  const [isQuickLauncherOpen, setIsQuickLauncherOpen] = useState(false);

  // Toast 消息
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 持久化系统变化
  const updateSystemsState = (newSystems: SapSystem[]) => {
    setSystems(newSystems);
    saveSystemsToStorage(newSystems);
  };

  // 全局快捷键监听 (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickLauncherOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && !isConnectionModalOpen) {
        e.preventDefault();
        setEditingSystem(null);
        setIsConnectionModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnectionModalOpen]);

  // 过滤系统列表
  const filteredSystems = useMemo(() => {
    return systems.filter((sys) => {
      // 分类过滤
      if (activeCategory === 'FAVORITES' && !sys.isFavorite) return false;
      if (['PRD', 'QAS', 'DEV', 'SBX'].includes(activeCategory) && sys.env !== activeCategory) return false;

      // 标签过滤
      if (selectedTag && (!sys.tags || !sys.tags.includes(selectedTag))) return false;

      // 搜索词过滤
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSid = sys.sid.toLowerCase().includes(q);
        const matchName = sys.name.toLowerCase().includes(q);
        const matchServer = sys.server.toLowerCase().includes(q);
        const matchClient = sys.client.toLowerCase().includes(q);
        const matchEnv = sys.env.toLowerCase().includes(q);
        const matchTags = sys.tags?.some(t => t.toLowerCase().includes(q));
        const matchAccounts = sys.accounts.some(
          a => a.username.toLowerCase().includes(q) || (a.alias && a.alias.toLowerCase().includes(q))
        );
        if (!matchSid && !matchName && !matchServer && !matchClient && !matchEnv && !matchTags && !matchAccounts) {
          return false;
        }
      }

      return true;
    });
  }, [systems, activeCategory, selectedTag, searchQuery]);

  // 快捷登录处理
  const handleLaunch = (system: SapSystem, account?: SapAccount) => {
    const activeAcc = account || system.accounts.find(a => a.id === system.activeAccountId) || system.accounts[0];

    // 更新登录次数与时间
    const updated = systems.map((s) => {
      if (s.id === system.id) {
        return {
          ...s,
          lastLoginAt: Date.now(),
          loginCount: (s.loginCount || 0) + 1,
        };
      }
      return s;
    });
    updateSystemsState(updated);

    // 触发下载/唤起 .sap 快捷方式
    downloadSapShortcut(system, activeAcc);

    addToast({
      type: 'launch',
      title: `⚡ 快捷登录已触发: ${system.sid} (${system.name})`,
      description: `账号: ${activeAcc?.username || '默认'} | 客户端: ${system.client} | 已生成 .sap 快捷方式`,
    });
  };

  // 收藏切换
  const handleToggleFavorite = (id: string) => {
    const updated = systems.map((s) => {
      if (s.id === id) {
        return { ...s, isFavorite: !s.isFavorite };
      }
      return s;
    });
    updateSystemsState(updated);
  };

  // 账号切换
  const handleSelectAccount = (systemId: string, accountId: string) => {
    const updated = systems.map((s) => {
      if (s.id === systemId) {
        return { ...s, activeAccountId: accountId };
      }
      return s;
    });
    updateSystemsState(updated);
  };

  // 复制密码
  const handleCopyPassword = (password: string) => {
    copyToClipboardWithTimeout(password, 30, () => {
      addToast({
        type: 'info',
        title: '🔒 剪贴板已自动安全清理',
        description: '已自动清除 30 秒前复制的 SAP 密码凭据。',
      });
    });

    addToast({
      type: 'success',
      title: '已复制密码到剪贴板',
      description: '可在 SAP GUI 中直接粘贴，剪贴板将在 30 秒后自动清空。',
    });
  };

  // 保存连接
  const handleSaveConnection = (savedSystem: SapSystem) => {
    const exists = systems.some((s) => s.id === savedSystem.id);
    let updated: SapSystem[];
    if (exists) {
      updated = systems.map((s) => (s.id === savedSystem.id ? savedSystem : s));
      addToast({ type: 'success', title: `系统 [${savedSystem.sid}] 配置已更新` });
    } else {
      updated = [savedSystem, ...systems];
      addToast({ type: 'success', title: `成功新建 SAP 连接: [${savedSystem.sid}] ${savedSystem.name}` });
    }
    updateSystemsState(updated);
  };

  // 删除系统
  const handleDeleteSystem = (id: string) => {
    const target = systems.find((s) => s.id === id);
    if (!target) return;
    if (window.confirm(`确定要删除 SAP 连接 [${target.sid}] ${target.name} 吗？`)) {
      const updated = systems.filter((s) => s.id !== id);
      updateSystemsState(updated);
      addToast({ type: 'warning', title: `已删除 SAP 连接: ${target.sid}` });
    }
  };

  // 导入 Landscape 处理
  const handleImportLandscape = (importedList: SapSystem[]) => {
    const updated = [...importedList, ...systems];
    updateSystemsState(updated);
    addToast({
      type: 'success',
      title: `🎉 成功导入 ${importedList.length} 个 SAP 连接配置`,
      description: '已同步并加入到系统列表中。',
    });
  };

  // 恢复默认示例数据
  const handleResetData = () => {
    if (window.confirm('是否重置为默认的演示 SAP 系统连接列表？')) {
      updateSystemsState(DEFAULT_SAP_SYSTEMS);
      addToast({ type: 'info', title: '已恢复预置示例 SAP 系统数据' });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c1017] text-slate-100">
      {/* 侧边导航栏 */}
      <Sidebar
        systems={systems}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        onResetDefaultData={handleResetData}
      />

      {/* 主工作区 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 顶部工具栏 */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenNewConnection={() => { setEditingSystem(null); setIsConnectionModalOpen(true); }}
          onOpenImport={() => setIsImportModalOpen(true)}
          onExportBackup={() => { exportBackupJson(systems); addToast({ type: 'success', title: '已导出备份配置文件' }); }}
          onOpenQuickLauncher={() => setIsQuickLauncherOpen(true)}
        />

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* 顶部分类指示标头 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>
                    {activeCategory === 'ALL' && '全部 SAP 系统'}
                    {activeCategory === 'FAVORITES' && '⭐ 常用收藏系统'}
                    {activeCategory === 'PRD' && '🔴 生产核心系统 (PRD)'}
                    {activeCategory === 'QAS' && '🔵 业务质量测试系统 (QAS)'}
                    {activeCategory === 'DEV' && '🟢 核心开发系统 (DEV)'}
                    {activeCategory === 'SBX' && '🟣 创新演练沙箱 (SBX)'}
                  </span>
                  {selectedTag && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      标签: #{selectedTag}
                    </span>
                  )}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                  {filteredSystems.length}
                </span>
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  清除搜索条件
                </button>
              )}
            </div>

            {/* 系统列表展示 (网格卡片 / 列表详细) */}
            {filteredSystems.length === 0 ? (
              <div className="py-20 text-center glass-panel rounded-2xl border border-slate-800/80 p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto text-slate-500">
                  <Server className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">没有匹配的 SAP 系统连接</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    您可以尝试修改搜索词，或者新建一个 SAP 系统连接配置，亦可导入 SAPUILandscape.xml。
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => { setEditingSystem(null); setIsConnectionModalOpen(true); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新建连接</span>
                  </button>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-400 inline mr-1" />
                    <span>导入 Landscape.xml</span>
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSystems.map((sys) => (
                  <SystemCard
                    key={sys.id}
                    system={sys}
                    onLaunch={handleLaunch}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={(s) => { setEditingSystem(s); setIsConnectionModalOpen(true); }}
                    onDelete={handleDeleteSystem}
                    onSelectAccount={handleSelectAccount}
                    onCopyPassword={handleCopyPassword}
                    onOpenShortcutModal={(s) => { setShortcutSystem(s); setIsShortcutModalOpen(true); }}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 pl-4 pr-2 w-8">⭐</th>
                      <th className="py-3 px-3">SID / 编号</th>
                      <th className="py-3 px-3">系统名称 / 描述</th>
                      <th className="py-3 px-3">服务器地址 / 组</th>
                      <th className="py-3 px-3">Client</th>
                      <th className="py-3 px-3">当前账号</th>
                      <th className="py-3 px-3">密码</th>
                      <th className="py-3 pr-4 pl-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSystems.map((sys) => (
                      <SystemListItem
                        key={sys.id}
                        system={sys}
                        onLaunch={handleLaunch}
                        onToggleFavorite={handleToggleFavorite}
                        onEdit={(s) => { setEditingSystem(s); setIsConnectionModalOpen(true); }}
                        onDelete={handleDeleteSystem}
                        onSelectAccount={handleSelectAccount}
                        onCopyPassword={handleCopyPassword}
                        onOpenShortcutModal={(s) => { setShortcutSystem(s); setIsShortcutModalOpen(true); }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 极速启动弹窗 (Cmd+K) */}
      <QuickLauncher
        isOpen={isQuickLauncherOpen}
        onClose={() => setIsQuickLauncherOpen(false)}
        systems={systems}
        onLaunch={handleLaunch}
        onCopyPassword={handleCopyPassword}
      />

      {/* 新建/编辑系统连接模态框 */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        system={editingSystem}
        onSave={handleSaveConnection}
      />

      {/* Landscape.xml 导入模态框 */}
      <LandscapeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportLandscape}
      />

      {/* 快捷方式生成与命令行启动模态框 */}
      <ShortcutModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        system={shortcutSystem}
      />

      {/* Toast 提示容器 */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;

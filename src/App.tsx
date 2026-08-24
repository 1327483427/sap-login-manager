import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SystemCard } from './components/SystemCard';
import { SystemListItem } from './components/SystemListItem';
import { QuickLauncher } from './components/QuickLauncher';
import { ConnectionModal } from './components/ConnectionModal';
import { LandscapeImportModal } from './components/LandscapeImportModal';
import { ShortcutModal } from './components/ShortcutModal';
import { AutoScanModal } from './components/AutoScanModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { SapSystem, SapAccount } from './types/sap';
import { 
  loadSystemsFromStorage, 
  saveSystemsToStorage, 
  exportBackupJson 
} from './services/storage';
import { launchDirectSapshcut } from './services/sapShortcut';
import { copyToClipboardWithTimeout } from './services/crypto';
import { scanLocalSapConfigs } from './services/autoScanner';
import { Server, Plus, Zap, Sparkles, X, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [systems, setSystems] = useState<SapSystem[]>(() => loadSystemsFromStorage());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);

  // 模态框状态
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SapSystem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [shortcutSystem, setShortcutSystem] = useState<SapSystem | null>(null);
  const [isQuickLauncherOpen, setIsQuickLauncherOpen] = useState(false);
  const [isAutoScanModalOpen, setIsAutoScanModalOpen] = useState(false);

  // 本地自动检测到的系统统计信息
  const [autoDetectedInfo, setAutoDetectedInfo] = useState<{ count: number; filePath: string } | null>(null);
  const [showAutoDetectBanner, setShowAutoDetectBanner] = useState(true);

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

  // 首次启动：如果本地没有缓存系统，则自动直接从本机 SAP 配置文件加载
  useEffect(() => {
    const initFromLocalSapConfig = async () => {
      setIsLoadingLocal(true);
      try {
        const res = await scanLocalSapConfigs();
        if (res.systems.length > 0) {
          setAutoDetectedInfo({
            count: res.systems.length,
            filePath: res.scannedFiles[0]?.path || '本地 SAP 配置文件',
          });

          // 如果存储中尚无系统数据，直接自动载入真实本机配置
          const cached = loadSystemsFromStorage();
          if (cached.length === 0) {
            updateSystemsState(res.systems);
            addToast({
              type: 'success',
              title: `🎉 已自动加载本机 SAP 配置 (${res.systems.length} 个系统)`,
              description: `来源: ${res.scannedFiles[0]?.path}`,
            });
          }
        }
      } catch (e) {
        console.error('加载本地配置出错:', e);
      } finally {
        setIsLoadingLocal(false);
      }
    };

    initFromLocalSapConfig();
  }, []);

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

  // 快捷直接登录处理（免下载，直接通过 sapshcut / CMD 拉起）
  const handleLaunch = async (system: SapSystem, account?: SapAccount) => {
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

    // 直接通过本地 API 执行 sapshcut 唤起 SAP GUI 登录（免下载）
    const res = await launchDirectSapshcut(system, activeAcc);

    addToast({
      type: 'launch',
      title: res.message || `⚡ 已通过 CMD/sapshcut 直接唤起 SAP GUI: ${system.sid}`,
      description: `账号: ${activeAcc?.username || '默认'} | Client: ${system.client}`,
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

  // 自动扫描导入覆盖或合并
  const handleAutoScanImport = (importedList: SapSystem[]) => {
    const existingMap = new Map(systems.map(s => [`${s.sid}_${s.server}_${s.client}`, s]));
    
    for (const item of importedList) {
      const key = `${item.sid}_${item.server}_${item.client}`;
      const existing = existingMap.get(key);
      if (existing) {
        const existingPw = existing.accounts[0]?.password;
        if (existingPw && item.accounts[0]) {
          item.accounts[0].password = existingPw;
        }
      }
      existingMap.set(key, item);
    }

    const merged = Array.from(existingMap.values());
    updateSystemsState(merged);
    setShowAutoDetectBanner(false);
  };

  // 重新从本地 SAP 配置文件全量加载
  const handleReloadFromLocalConfig = async () => {
    setIsLoadingLocal(true);
    try {
      const res = await scanLocalSapConfigs();
      if (res.systems.length > 0) {
        const existingPwMap = new Map<string, string>();
        for (const sys of systems) {
          for (const acc of sys.accounts) {
            if (acc.password) existingPwMap.set(`${sys.sid}_${acc.username}`, acc.password);
          }
        }

        const reloaded = res.systems.map(sys => {
          const acc = sys.accounts[0];
          if (acc) {
            const savedPw = existingPwMap.get(`${sys.sid}_${acc.username}`);
            if (savedPw) acc.password = savedPw;
          }
          return sys;
        });

        updateSystemsState(reloaded);
        addToast({
          type: 'success',
          title: `✅ 已重新从本机 SAP GUI 配置文件加载 ${reloaded.length} 个系统`,
          description: `来源: ${res.scannedFiles[0]?.path}`,
        });
      } else {
        addToast({
          type: 'warning',
          title: '未能在标准路径下找到 SAP 配置文件',
          description: '请检查本机是否安装了 SAP GUI 或手动导入配置。',
        });
      }
    } catch (e: any) {
      addToast({
        type: 'warning',
        title: '读取本机配置失败',
        description: e.message,
      });
    } finally {
      setIsLoadingLocal(false);
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
        onReloadLocalConfig={handleReloadFromLocalConfig}
        onOpenAutoScan={() => setIsAutoScanModalOpen(true)}
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
          onOpenAutoScan={() => setIsAutoScanModalOpen(true)}
        />

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* 本地自动检测到的 SAP 配置提示 Banner */}
            {autoDetectedInfo && showAutoDetectBanner && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/40 flex items-center justify-between gap-4 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 animate-pulse text-blue-400" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span>已自动读取本机 SAP GUI 配置文件</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {autoDetectedInfo.count} 个系统连接
                      </span>
                    </div>
                    <p className="text-slate-400 font-mono truncate mt-0.5" title={autoDetectedInfo.filePath}>
                      配置文件: {autoDetectedInfo.filePath}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsAutoScanModalOpen(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>查看与管理命令</span>
                  </button>
                  <button
                    onClick={() => setShowAutoDetectBanner(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                    title="忽略提示"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

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
            {isLoadingLocal ? (
              <div className="py-20 text-center glass-panel rounded-2xl border border-slate-800/80 p-8 space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                <h3 className="font-bold text-sm text-slate-200">正在从本地 SAP 配置文件读取连接...</h3>
              </div>
            ) : filteredSystems.length === 0 ? (
              <div className="py-20 text-center glass-panel rounded-2xl border border-slate-800/80 p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto text-slate-500">
                  <Server className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">未检测到或暂无匹配的 SAP 系统连接</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    您可以点击「自动读取本地配置」从本机的 SAP GUI 自动生成系统，或点击「新建连接」。
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleReloadFromLocalConfig}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>自动读取本地配置</span>
                  </button>
                  <button
                    onClick={() => { setEditingSystem(null); setIsConnectionModalOpen(true); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    <span>新建连接</span>
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

      {/* 自动扫描与快捷方式生成模态框 */}
      <AutoScanModal
        isOpen={isAutoScanModalOpen}
        onClose={() => setIsAutoScanModalOpen(false)}
        onImportSystems={handleAutoScanImport}
        onShowToast={addToast}
      />

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
        onShowToast={addToast}
      />

      {/* Toast 提示容器 */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;

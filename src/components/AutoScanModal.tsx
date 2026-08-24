import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  Zap, 
  FileText, 
  CheckCircle2, 
  Server, 
  FolderDown 
} from 'lucide-react';
import { SapSystem } from '../types/sap';
import { scanLocalSapConfigs, batchExportShortcutsToDesktop, ScanResult } from '../services/autoScanner';

interface AutoScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSystems: (systems: SapSystem[]) => void;
  onShowToast: (toast: { type: 'success' | 'info' | 'warning' | 'launch'; title: string; description?: string }) => void;
}

export const AutoScanModal: React.FC<AutoScanModalProps> = ({
  isOpen,
  onClose,
  onImportSystems,
  onShowToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<ScanResult['foundFiles']>([]);
  const [discoveredSystems, setDiscoveredSystems] = useState<SapSystem[]>([]);
  const [selectedSystemIds, setSelectedSystemIds] = useState<Set<string>>(new Set());
  const [exportingToDesktop, setExportingToDesktop] = useState(false);

  const runScan = async () => {
    setLoading(true);
    try {
      const res = await scanLocalSapConfigs();
      setScannedFiles(res.scannedFiles);
      setDiscoveredSystems(res.systems);
      setSelectedSystemIds(new Set(res.systems.map(s => s.id)));
    } catch (e: any) {
      console.error('扫描出错:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runScan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedSystemIds.size === discoveredSystems.length) {
      setSelectedSystemIds(new Set());
    } else {
      setSelectedSystemIds(new Set(discoveredSystems.map(s => s.id)));
    }
  };

  const toggleSelectSystem = (id: string) => {
    const next = new Set(selectedSystemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSystemIds(next);
  };

  // 导入并同步到主程序
  const handleConfirmImport = () => {
    const toImport = discoveredSystems.filter(s => selectedSystemIds.has(s.id));
    if (toImport.length === 0) return;
    onImportSystems(toImport);
    onShowToast({
      type: 'success',
      title: `🎉 成功自动读取并生成 ${toImport.length} 个 SAP 系统连接`,
      description: '已同步工作区分组、SID、服务器、实例号与配置账号。',
    });
    onClose();
  };

  // 一键生成所有 .bat 批处理文件到桌面
  const handleExportToDesktop = async () => {
    const toExport = discoveredSystems.filter(s => selectedSystemIds.has(s.id));
    if (toExport.length === 0) return;

    setExportingToDesktop(true);
    try {
      const res = await batchExportShortcutsToDesktop(toExport);
      if (res.success) {
        onShowToast({
          type: 'launch',
          title: `🚀 已在桌面生成 ${res.savedFiles?.length || toExport.length} 个 .bat 批处理快捷方式`,
          description: `保存路径: ${res.destDir || '桌面/SAP_Shortcuts'} (双击即可免密直连登录)`,
        });
      } else {
        onShowToast({
          type: 'warning',
          title: '生成桌面快捷方式失败',
          description: res.error || '无法写入桌面文件夹',
        });
      }
    } catch (e: any) {
      onShowToast({
        type: 'warning',
        title: '生成失败',
        description: e.message,
      });
    } finally {
      setExportingToDesktop(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-3xl bg-[#141923] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>本地 SAP Logon 配置与批处理快捷方式自动读取</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  一键读取生成
                </span>
              </h2>
              <p className="text-xs text-slate-400">自动检测本地 SAP GUI (macOS / Windows) 配置文件及 sapshcut 参数</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* 状态与扫描到的文件 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>检测到的本地 SAP 配置文件</span>
              </span>
              <button
                onClick={runScan}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>重新扫描</span>
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center glass-panel rounded-xl space-y-2">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
                <p className="text-slate-300 text-xs font-medium">正在扫描系统中的 SAP 配置文件与快捷方式...</p>
              </div>
            ) : scannedFiles.length === 0 ? (
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-slate-400 space-y-1">
                <p className="text-slate-300 font-medium">未能在默认标准路径下检测到 SAP 配置文件</p>
                <p className="text-[11px]">
                  您也可以使用顶部导航栏的「导入配置」功能手动上传或粘贴 <code className="text-blue-400">SAPUILandscape.xml</code>。
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {scannedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 truncate font-mono">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate" title={file.path}>
                          {file.path} ({Math.round(file.size / 1024 * 10) / 10} KB)
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono border border-slate-700 shrink-0">
                      {file.type === 'landscape_xml' ? 'SAP Landscape' : 'Logon INI'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 解析出的系统列表预览 */}
          {discoveredSystems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span>识别出 {discoveredSystems.length} 个 SAP 系统连接</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    已勾选 {selectedSystemIds.size}
                  </span>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-blue-400 hover:underline"
                >
                  {selectedSystemIds.size === discoveredSystems.length ? '取消全选' : '全选'}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {discoveredSystems.map((sys) => {
                  const isChecked = selectedSystemIds.has(sys.id);
                  const acc = sys.accounts[0];

                  return (
                    <div
                      key={sys.id}
                      onClick={() => toggleSelectSystem(sys.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-blue-600/15 border-blue-500/40 text-slate-100'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-blue-600"
                        />
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0 font-mono">
                          <span className="font-bold text-xs text-white">{sys.sid}</span>
                          <span className="text-[9px] text-slate-400">#{sys.instanceNumber}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200 truncate">
                              {sys.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Client {sys.client}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            <span>服务器: {sys.server}</span>
                            {acc?.username && (
                              <span className="text-blue-400">账号: {acc.username}</span>
                            )}
                            {sys.sapRouter && (
                              <span className="text-amber-400/80">Router穿透</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 标签 */}
                      <div className="flex items-center gap-1 shrink-0">
                        {sys.tags?.map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作工具栏 */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex items-center gap-2">
            {discoveredSystems.length > 0 && (
              <button
                onClick={handleExportToDesktop}
                disabled={exportingToDesktop || selectedSystemIds.size === 0}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
                title="将选中的快捷方式直接生成 .bat 批处理文件并保存到桌面文件夹"
              >
                <FolderDown className="w-3.5 h-3.5 text-purple-400" />
                <span>{exportingToDesktop ? '正在生成...' : '自动导出 .bat 批处理到桌面'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
            >
              取消
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={selectedSystemIds.size === 0}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>自动导入并生成选中的 {selectedSystemIds.size} 个连接</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

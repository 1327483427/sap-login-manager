import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  Check, 
  AlertCircle
} from 'lucide-react';
import { SapSystem } from '../types/sap';
import { parseSapLandscapeXml, parseSapLogonIni } from '../services/landscapeParser';
import { decodeSmartBuffer, sanitizeText } from '../services/encodingHelper';

interface LandscapeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedSystems: SapSystem[]) => void;
}

export const LandscapeImportModal: React.FC<LandscapeImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [parsedList, setParsedList] = useState<SapSystem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');

  if (!isOpen) return null;

  const handleFileRead = (content: string, filename: string) => {
    setErrorMsg(null);
    try {
      const cleanContent = sanitizeText(content);
      let systems: SapSystem[] = [];
      if (filename.toLowerCase().endsWith('.xml') || cleanContent.trim().startsWith('<?xml') || cleanContent.includes('<Landscape')) {
        systems = parseSapLandscapeXml(cleanContent);
      } else if (filename.toLowerCase().endsWith('.ini') || cleanContent.includes('[Description]') || cleanContent.includes('[Server]')) {
        systems = parseSapLogonIni(cleanContent);
      } else {
        try {
          systems = parseSapLandscapeXml(cleanContent);
        } catch {
          systems = parseSapLogonIni(cleanContent);
        }
      }

      if (systems.length === 0) {
        setErrorMsg('未能从文件中识别出有效的 SAP 系统连接配置，请确认文件格式。');
        return;
      }

      setParsedList(systems);
      setSelectedIds(new Set(systems.map(s => s.id)));
    } catch (e: any) {
      setErrorMsg(`解析失败: ${e.message || '未知错误'}`);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    // 使用 ArrayBuffer + 智能编码探测，彻底杜绝 GBK/ANSI 上传乱码
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        const decodedContent = decodeSmartBuffer(arrayBuffer);
        handleFileRead(decodedContent, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePasteParse = () => {
    if (!rawText.trim()) return;
    handleFileRead(rawText, 'pasted.xml');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === parsedList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedList.map(s => s.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirmImport = () => {
    const toImport = parsedList.filter(s => selectedIds.has(s.id));
    if (toImport.length === 0) return;
    onImport(toImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-2xl bg-[#141923] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                导入 SAP 官方配置文件 (Landscape / INI)
              </h2>
              <p className="text-xs text-slate-400">支持 UTF-8 / GBK 编码自动探测与无乱码解析</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 主体内容 */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {parsedList.length === 0 ? (
            <>
              {/* Tab 切换 */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activeTab === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  上传文件
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activeTab === 'paste' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  粘贴 XML 文本
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 rounded-2xl p-8 text-center transition group bg-slate-900/40">
                  <input
                    type="file"
                    accept=".xml,.ini,.txt,.sap"
                    onChange={handleFileInput}
                    className="hidden"
                    id="landscape-file-input"
                  />
                  <label htmlFor="landscape-file-input" className="cursor-pointer block space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto group-hover:scale-110 transition">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">
                        点击选择或将 SAP 配置文件拖拽至此处
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        通常位于: <code className="text-blue-400 bg-slate-800 px-1 py-0.5 rounded">%APPDATA%\SAP\Common\SAPUILandscape.xml</code>
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={8}
                    placeholder="请将 SAPUILandscape.xml 或 saplogon.ini 的内容直接粘贴到这里..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 font-mono text-[11px] outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handlePasteParse}
                    disabled={!rawText.trim()}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition"
                  >
                    解析粘贴的内容
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          ) : (
            /* 解析结果预览 */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  成功解析出 {parsedList.length} 个 SAP 系统连接:
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-blue-400 hover:underline text-xs"
                >
                  {selectedIds.size === parsedList.length ? '取消全选' : '全选'}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {parsedList.map((sys) => {
                  const isChecked = selectedIds.has(sys.id);
                  return (
                    <div
                      key={sys.id}
                      onClick={() => toggleSelectItem(sys.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isChecked
                          ? 'bg-blue-600/15 border-blue-500/40 text-slate-100'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-blue-600"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-400">{sys.sid}</span>
                            <span className="font-medium text-slate-200">{sys.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Server: {sys.server} | Client: {sys.client} | #{sys.instanceNumber}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          {parsedList.length > 0 ? (
            <>
              <button
                onClick={() => { setParsedList([]); setSelectedIds(new Set()); }}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs"
              >
                重新选择文件
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={selectedIds.size === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>导入选中的 {selectedIds.size} 个系统</span>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
            >
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

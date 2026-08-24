import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Server, 
  Check
} from 'lucide-react';
import { SapSystem, SapAccount, EnvironmentType, ConnectionType } from '../types/sap';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: SapSystem | null; // null 表示新建
  onSave: (system: SapSystem) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  system,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [sid, setSid] = useState('');
  const [description, setDescription] = useState('');
  const [env, setEnv] = useState<EnvironmentType>('DEV');
  const [connectionType, setConnectionType] = useState<ConnectionType>('custom');
  const [server, setServer] = useState('');
  const [instanceNumber, setInstanceNumber] = useState('00');
  const [client, setClient] = useState('100');
  const [language, setLanguage] = useState('ZH');
  const [messageServer, setMessageServer] = useState('');
  const [group, setGroup] = useState('PUBLIC');
  const [sapRouter, setSapRouter] = useState('');
  const [webGuiUrl, setWebGuiUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [accounts, setAccounts] = useState<SapAccount[]>([]);
  const [showPasswordIdx, setShowPasswordIdx] = useState<number | null>(null);

  useEffect(() => {
    if (system) {
      setName(system.name || '');
      setSid(system.sid || '');
      setDescription(system.description || '');
      setEnv(system.env || 'DEV');
      setConnectionType(system.connectionType || 'custom');
      setServer(system.server || '');
      setInstanceNumber(system.instanceNumber || '00');
      setClient(system.client || '100');
      setLanguage(system.language || 'ZH');
      setMessageServer(system.messageServer || '');
      setGroup(system.group || 'PUBLIC');
      setSapRouter(system.sapRouter || '');
      setWebGuiUrl(system.webGuiUrl || '');
      setTagsInput(system.tags ? system.tags.join(', ') : '');
      setAccounts(system.accounts && system.accounts.length > 0 ? [...system.accounts] : [
        { id: `acc-${Date.now()}`, alias: '默认账号', username: '', password: '', isDefault: true, autoLogin: true }
      ]);
    } else {
      setName('');
      setSid('');
      setDescription('');
      setEnv('DEV');
      setConnectionType('custom');
      setServer('');
      setInstanceNumber('00');
      setClient('100');
      setLanguage('ZH');
      setMessageServer('');
      setGroup('PUBLIC');
      setSapRouter('');
      setWebGuiUrl('');
      setTagsInput('ABAP开发');
      setAccounts([
        { id: `acc-${Date.now()}`, alias: '日常开发', username: '', password: '', isDefault: true, autoLogin: true }
      ]);
    }
  }, [system, isOpen]);

  if (!isOpen) return null;

  const handleAddAccount = () => {
    setAccounts([
      ...accounts,
      {
        id: `acc-${Date.now()}`,
        alias: `账号 ${accounts.length + 1}`,
        username: '',
        password: '',
        isDefault: accounts.length === 0,
        autoLogin: true,
      }
    ]);
  };

  const handleRemoveAccount = (id: string) => {
    if (accounts.length <= 1) return;
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const handleAccountChange = (id: string, field: keyof SapAccount, value: any) => {
    setAccounts(accounts.map(acc => {
      if (acc.id === id) {
        return { ...acc, [field]: value };
      }
      if (field === 'isDefault' && value === true) {
        return { ...acc, isDefault: false };
      }
      return acc;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sid.trim() || (!server.trim() && !messageServer.trim())) {
      alert('请填写系统标识 (SID) 和服务器地址！');
      return;
    }

    const tags = tagsInput.split(/[,，\s]+/).filter(Boolean);

    const updatedSystem: SapSystem = {
      id: system?.id || `sys-${Date.now()}`,
      name: name.trim() || `${sid.toUpperCase()} 系统`,
      sid: sid.trim().toUpperCase(),
      description: description.trim(),
      env,
      connectionType,
      server: server.trim(),
      instanceNumber: instanceNumber.trim() || '00',
      client: client.trim() || '800',
      language: language.trim().toUpperCase() || 'ZH',
      messageServer: messageServer.trim() || undefined,
      group: group.trim() || undefined,
      sapRouter: sapRouter.trim() || undefined,
      webGuiUrl: webGuiUrl.trim() || undefined,
      accounts: accounts.map(a => ({ ...a, username: a.username.trim() })),
      activeAccountId: accounts[0]?.id,
      tags,
      isFavorite: system?.isFavorite || false,
      loginCount: system?.loginCount || 0,
      createdAt: system?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(updatedSystem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-full max-w-3xl bg-[#141923] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                {system ? '编辑 SAP 连接配置' : '新建 SAP 连接配置'}
              </h2>
              <p className="text-xs text-slate-400">配置 SAP 系统连接参数与多账号凭据</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-130px)] text-xs text-slate-200">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. 基本信息与环境分类</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  系统名称 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如: S/4HANA 核心开发系统"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  系统标识 (SID) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如: S4D, PRD"
                  maxLength={4}
                  value={sid}
                  onChange={(e) => setSid(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono font-bold outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  环境类型
                </label>
                <select
                  value={env}
                  onChange={(e) => setEnv(e.target.value as EnvironmentType)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="DEV">🟢 开发环境 (DEV)</option>
                  <option value="QAS">🔵 测试环境 (QAS)</option>
                  <option value="PRD">🔴 生产环境 (PRD)</option>
                  <option value="SBX">🟣 沙箱环境 (SBX)</option>
                  <option value="OTHER">⚪ 其他系统 (OTHER)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">系统详细描述 (可选)</label>
              <input
                type="text"
                placeholder="例如: ADT 开发 / 增强功能测试 / 生产运维"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 连接服务器参数 */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>2. SAP 服务器网络连接参数</span>
              <div className="flex items-center gap-3 text-xs font-normal normal-case">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="connType"
                    checked={connectionType === 'custom'}
                    onChange={() => setConnectionType('custom')}
                    className="text-blue-600"
                  />
                  <span>自定义应用服务器</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="connType"
                    checked={connectionType === 'group'}
                    onChange={() => setConnectionType('group')}
                    className="text-blue-600"
                  />
                  <span>消息服务器/组</span>
                </label>
              </div>
            </div>

            {connectionType === 'custom' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1.5">
                    应用服务器地址 (IP 或 主机名) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如: 192.168.1.150 或 sapdev.corp.com"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    系统编号 / 实例号 (Instance No) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="00"
                    maxLength={2}
                    value={instanceNumber}
                    onChange={(e) => setInstanceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1.5">
                    消息服务器 (Message Server) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如: ms-s4p.mycorp.com"
                    value={messageServer}
                    onChange={(e) => { setMessageServer(e.target.value); setServer(e.target.value); }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    登录组 (Group / Server)
                  </label>
                  <input
                    type="text"
                    placeholder="PUBLIC / SPACE"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>
            )}

            {/* 进阶 SAProuter 与客户端设置 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">默认客户端 (Client)</label>
                <input
                  type="text"
                  placeholder="800"
                  maxLength={3}
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">默认语言 (Language)</label>
                <input
                  type="text"
                  placeholder="ZH 或 EN"
                  maxLength={2}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">业务标签 (逗号隔开)</label>
                <input
                  type="text"
                  placeholder="例如: ABAP开发, 财务"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                SAProuter 路由穿透字符串 (可选)
              </label>
              <input
                type="text"
                placeholder="例如: /H/vpn.company.com/S/3299/W/pass/H/"
                value={sapRouter}
                onChange={(e) => setSapRouter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 账号与密码管理 (一系统多账号) */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                3. 账号与密码管理 (支持一系统多账号)
              </div>
              <button
                type="button"
                onClick={handleAddAccount}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加账号</span>
              </button>
            </div>

            <div className="space-y-3">
              {accounts.map((acc, index) => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center gap-3 justify-between"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 w-full">
                    {/* 账号别名 */}
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">账号别名</label>
                      <input
                        type="text"
                        placeholder="例如: 日常开发"
                        value={acc.alias}
                        onChange={(e) => handleAccountChange(acc.id, 'alias', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* 用户名 */}
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">
                        SAP 用户名 <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="例如: LIQP"
                        value={acc.username}
                        onChange={(e) => handleAccountChange(acc.id, 'username', e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono font-bold uppercase outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* 密码 */}
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">密码</label>
                      <div className="relative">
                        <input
                          type={showPasswordIdx === index ? 'text' : 'password'}
                          placeholder="••••••••••••"
                          value={acc.password}
                          onChange={(e) => handleAccountChange(acc.id, 'password', e.target.value)}
                          className="w-full pl-2.5 pr-8 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordIdx(showPasswordIdx === index ? null : index)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showPasswordIdx === index ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 默认选择与删除 */}
                  <div className="flex items-center gap-2 pt-2 md:pt-4 self-end md:self-auto">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acc.isDefault}
                        onChange={(e) => handleAccountChange(acc.id, 'isDefault', e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>设为默认</span>
                    </label>

                    {accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAccount(acc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="删除此账号"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-medium transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>保存配置</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

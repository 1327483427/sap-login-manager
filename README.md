# SAP Quick Logon (SAP 登录管理程序)

> ⚡ 现代化、安全且高效的 SAP 系统连接、凭据管理与一键快捷启动助手。

---

## 🌟 核心功能

- **多环境色彩看板**：PRD (红)、QAS (蓝)、DEV (绿)、SBX (紫)，清晰区分生产/测试/开发系统。
- **一系统多账号支持**：一个系统支持绑定多个开发号、管理员号、测试号，一键快速切换。
- **一键免密快捷登录**：点击即可生成并自动触发 SAP GUI 登录。
- **.sap 快捷方式文件导出**：生成官方标准 `.sap` 快捷方式文件，双击即可由 SAP GUI 打开。
- **Spotlight 极速启动 (`Cmd + K` / `Ctrl + K`)**：支持模糊搜索 SID、系统名、账号、客户端，回车直接登录。
- **安全密码保管箱**：本地 AES-256 加密，防窥密码掩码，复制密码后支持 30 秒自动清空剪贴板。
- **导入 SAP 官方配置**：支持导入 `SAPUILandscape.xml` 与 `saplogon.ini` 配置文件，免去手动逐个配置。
- **跨平台命令支持**：支持 Windows (`sapshcut.exe`) 及 macOS (`SAP GUI for Java`) 启动命令生成。

---

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript + Vite
- **UI & 样式**: Tailwind CSS + Lucide Icons
- **加密安全**: Web Crypto API (AES-256-GCM)
- **快捷方式解析**: SAP Shortcut Generator & Landscape XML Parser

---

## 🚀 本地开发与运行

```bash
# 进入项目目录
cd sap-login-manager

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

---

## 📄 License

MIT License

# MiniDemand

一个轻量级的 Open OnDemand 实现，提供 Web 终端、文件管理和 HPC 任务管理功能。

## 功能特性

### 🖥️ Web 终端 (Shell App)
- 基于 WebSocket 的实时终端交互
- 支持 hterm 终端模拟器
- 可配置的主题和光标样式
- 支持 ANSI 转义序列渲染
- 自动重连和会话恢复

### 📁 文件管理 (Files App)
- 文件浏览器界面
- 支持文件上传、下载、删除
- 在线文件编辑器
- 目录创建和导航
- 文件权限管理

### 🎯 HPC 任务管理 (Jobs App)
- 任务提交和监控
- 任务模板管理 (CRUD)
- 支持多种作业类型：
  - 基础作业 (Basic Job)
  - GPU 作业 (GPU Job)
  - 并行作业 (Parallel Job)
- 实时任务状态更新
- 任务历史记录

### 🖥️ 交互式桌面 (Desktop App)
- 通过浏览器访问远程图形化桌面
- 支持多种桌面环境：
  - MATE Desktop
  - Xfce Desktop
  - GNOME Desktop
  - KDE Plasma
- 会话管理（创建、监控、停止）
- 资源配置（分辨率、CPU、内存）
- VNC 连接支持

### 🏠 统一仪表板 (Dashboard)
- 应用统一管理界面
- 动态应用发现
- 应用状态监控
- 快速应用访问

## 项目架构

```
minidemand/
├── apps/                    # 应用模块
│   ├── shell/              # Web 终端应用
│   │   ├── server/         # Node.js 服务器
│   │   ├── public/         # 前端资源
│   │   └── manifest.yml    # 应用配置
│   ├── files/              # 文件管理应用
│   ├── jobs/               # HPC 任务管理应用
│   ├── desktop/            # 交互式桌面应用
│   └── dashboard/          # 统一仪表板
├── shared/                 # 共享工具
├── config/                 # 配置文件
└── scripts/               # 启动脚本
```

## 技术栈

- **后端**: Node.js + Express
- **前端**: HTML5 + CSS3 + JavaScript
- **终端**: hterm + node-pty
- **通信**: WebSocket
- **文件系统**: Node.js fs API

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装各应用依赖
cd apps/shell && npm install
cd ../files && npm install
cd ../jobs && npm install
cd ../desktop && npm install
cd ../dashboard && npm install
```

### 启动服务

#### 方式一：一键启动所有服务
```bash
./scripts/start-all.sh
```

#### 方式二：分别启动各应用
```bash
# 启动 Shell 应用 (端口 3000)
cd apps/shell && npm start

# 启动 Files 应用 (端口 3001)
cd apps/files && npm start

# 启动 Jobs 应用 (端口 3003)
cd apps/jobs && npm start

# 启动 Desktop 应用 (端口 3004)
cd apps/desktop && npm start

# 启动 Dashboard 应用 (端口 3002)
cd apps/dashboard && npm start
```

### 访问应用

- **Dashboard**: http://localhost:3002
- **Shell**: http://localhost:3000
- **Files**: http://localhost:3001
- **Jobs**: http://localhost:3003
- **Desktop**: http://localhost:3004

## 配置说明

### 应用配置

每个应用都有独立的 `manifest.yml` 配置文件：

```yaml
---
name: 应用名称
description: 应用描述
category: 应用分类
icon: fa://图标名称
role: 应用角色
url: 应用路径
new_window: 是否新窗口打开
id: 应用唯一标识
```

### 端口配置

默认端口分配：
- Shell: 3000
- Files: 3001
- Dashboard: 3002
- Jobs: 3003
- Desktop: 3004

## 开发指南

### 添加新应用

1. 在 `apps/` 目录下创建新应用目录
2. 创建 `manifest.yml` 配置文件
3. 实现 `server/app.js` 服务器
4. 创建 `public/` 前端资源
5. 在 Dashboard 中注册新应用

### 应用结构

```
apps/your-app/
├── manifest.yml          # 应用配置
├── package.json          # 依赖配置
├── server/
│   └── app.js           # 服务器代码
└── public/
    ├── index.html       # 主页面
    ├── css/
    │   └── style.css    # 样式文件
    └── js/
        └── app.js       # 前端逻辑
```

## API 文档

### Shell 应用 API

- `GET /` - 终端页面
- `WebSocket /ws` - 终端连接

### Files 应用 API

- `GET /api/files?path=...` - 获取文件列表
- `POST /api/files/upload` - 上传文件
- `GET /api/files/download?path=...` - 下载文件
- `DELETE /api/files?path=...` - 删除文件
- `POST /api/files/mkdir` - 创建目录

### Jobs 应用 API

- `GET /api/jobs` - 获取任务列表
- `POST /api/jobs` - 提交新任务
- `GET /api/jobs/:id` - 获取任务详情
- `DELETE /api/jobs/:id` - 取消任务
- `GET /api/templates` - 获取模板列表
- `POST /api/templates` - 创建模板
- `PUT /api/templates/:id` - 更新模板
- `DELETE /api/templates/:id` - 删除模板

### Dashboard 应用 API

- `GET /api/apps` - 获取应用列表

## 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口是否被占用：`lsof -i :3000`
   - 修改应用配置中的端口号

2. **依赖安装失败**
   - 使用国内镜像：`npm config set registry https://registry.npmmirror.com`
   - 清除缓存：`npm cache clean --force`

3. **WebSocket 连接失败**
   - 检查防火墙设置
   - 确认服务器正在运行

4. **文件权限问题**
   - 确保应用有文件系统访问权限
   - 检查文件路径配置

### 日志查看

各应用会在控制台输出详细日志，包括：
- 服务器启动信息
- API 请求日志
- WebSocket 连接状态
- 错误信息

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 致谢

- [Open OnDemand](https://openondemand.org/) - 灵感来源
- [hterm](https://github.com/hterm/hterm) - 终端模拟器
- [node-pty](https://github.com/microsoft/node-pty) - 伪终端支持

## 更新日志

### v2.1.0 (2025-01-29)
- 🎉 添加交互式桌面应用（Desktop App）
- ✨ 支持 MATE、Xfce、GNOME、KDE 四种桌面环境
- ✨ 完整的桌面会话管理功能
- ✨ 资源配置和 VNC 连接支持
- 📝 完善的文档和启动脚本
- 🎨 现代化响应式 UI 设计

### v2.0.0 (2025-01-28)
- 🎉 重构为模块化架构
- ✨ 添加文件管理功能
- ✨ 添加 HPC 任务管理功能
- ✨ 添加统一仪表板
- 🔧 优化应用配置和部署
- 🐛 修复终端显示和连接问题

### v1.0.0 (2025-01-27)
- 🎉 初始版本发布
- ✨ 基础 Web 终端功能
- 🔧 基础项目结构
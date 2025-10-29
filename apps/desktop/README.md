# Interactive Desktop - MiniDemand

一个仿照 Open OnDemand 实现的轻量级交互式桌面应用，支持通过 Web 浏览器启动和访问远程图形化桌面环境。

## 功能特性

### 🖥️ 多桌面环境支持
- **MATE Desktop** - 轻量级桌面环境
- **Xfce Desktop** - 快速且轻量的桌面环境
- **GNOME Desktop** - 现代化桌面环境
- **KDE Plasma** - 功能丰富的桌面环境

### 📋 会话管理
- 创建新的桌面会话
- 配置分辨率、CPU、内存等资源
- 查看所有活动会话
- 实时会话状态更新
- 停止和删除会话

### 🔧 资源配置
- **分辨率选择**: 支持多种常见分辨率（720p 到 Full HD）
- **运行时长**: 最多 24 小时
- **CPU 核心**: 1-16 个核心
- **内存**: 1-64 GB

### 🌐 VNC 连接
- 自动生成 VNC 密码
- WebSocket 代理支持（预留 noVNC 集成）
- 连接信息展示

## 项目结构

```
desktop/
├── manifest.yml              # 应用配置
├── package.json              # 依赖管理
├── README.md                 # 本文档
├── server/
│   └── app.js               # Node.js 服务器
├── public/
│   ├── index.html           # 主界面
│   ├── css/
│   │   └── style.css        # 样式文件
│   └── js/
│       └── desktop.js       # 前端逻辑
└── templates/
    └── desktops/            # 桌面启动脚本
        ├── mate.sh
        ├── xfce.sh
        ├── gnome.sh
        └── kde.sh
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

**真实 VNC 模式额外要求**:
- VNC Server（TurboVNC/TigerVNC/x11vnc）
- Websockify
- Python >= 3.6
- 桌面环境（MATE/Xfce/GNOME/KDE）

### 安装依赖

```bash
cd apps/desktop

# 安装 Node.js 依赖
npm install

# 安装 noVNC 客户端
npm run install-novnc

# （可选）安装真实 VNC 依赖
# 参见 INSTALL.md 详细说明
```

### 启动服务

#### 模拟模式（开发/测试）

```bash
npm start
```

#### 真实 VNC 模式（生产环境）

```bash
# 方式 1: 使用环境变量
USE_REAL_VNC=true npm start

# 方式 2: 导出环境变量
export USE_REAL_VNC=true
npm start
```

应用将在 http://localhost:3004 启动

> **💡 提示**: 首次使用真实 VNC 模式，请先阅读 [INSTALL.md](INSTALL.md) 完成系统配置。

### 访问应用

1. 打开浏览器访问 http://localhost:3004
2. 选择桌面环境（MATE、Xfce、GNOME 或 KDE）
3. 配置资源参数（分辨率、CPU、内存等）
4. 点击"启动桌面会话"
5. 等待会话启动完成
6. 点击"连接桌面"开始使用

## API 文档

### 获取桌面环境列表

```http
GET /api/desktops
```

响应：
```json
{
  "mate": {
    "name": "MATE Desktop",
    "description": "A lightweight desktop environment",
    "icon": "desktop",
    "script": "mate.sh"
  },
  ...
}
```

### 创建新会话

```http
POST /api/sessions
Content-Type: application/json

{
  "desktop": "mate",
  "resolution": "1920x1080",
  "duration": 2,
  "cores": 1,
  "memory": 2
}
```

响应：
```json
{
  "id": "uuid",
  "desktop": "mate",
  "desktopName": "MATE Desktop",
  "status": "starting",
  "password": "abc123",
  "port": 5901,
  ...
}
```

### 获取所有会话

```http
GET /api/sessions
```

### 获取会话详情

```http
GET /api/sessions/:id
```

### 停止会话

```http
POST /api/sessions/:id/cancel
```

### 删除会话

```http
DELETE /api/sessions/:id
```

### 获取 VNC 连接信息

```http
GET /api/sessions/:id/vnc
```

响应：
```json
{
  "host": "hostname",
  "port": 5901,
  "password": "abc123",
  "path": "vnc/session-id",
  "autoconnect": true
}
```

## 工作原理

### 架构设计

本应用仿照 Open OnDemand 的 Batch Connect 机制，简化实现了交互式桌面功能：

```
用户提交表单 → 创建会话 → 模拟 VNC 服务器启动 → 提供连接信息
```

### 实现细节

1. **会话管理**
   - 使用内存存储会话数据（生产环境应使用数据库）
   - 每个会话生成唯一 ID、密码和端口
   - 支持会话状态跟踪（starting、running、completed 等）

2. **VNC 集成**（当前为模拟实现）
   - 生成随机 VNC 密码
   - 分配端口号（5900-6000 范围）
   - 预留 noVNC 集成接口

3. **桌面脚本**
   - 基于 OnDemand 的桌面启动脚本
   - 配置桌面环境特定设置
   - 禁用屏保、自动启动服务等

### 与 OnDemand 的对比

| 特性 | OnDemand | MiniDemand Desktop |
|------|----------|-------------------|
| 技术栈 | Ruby on Rails | Node.js + Express |
| VNC 实现 | 真实 VNC Server | 模拟（可扩展） |
| 调度器集成 | Slurm/PBS/SGE | 无（可扩展） |
| 数据存储 | 文件系统 + 缓存 | 内存（可扩展） |
| noVNC 支持 | 完整集成 | 预留接口 |
| 桌面脚本 | 完整 | 简化版 |

## 生产环境部署

要在生产环境中使用，需要实现以下功能：

### 1. 真实 VNC 服务器集成

```javascript
// 在 server/app.js 中实现
const { spawn } = require('child_process');

async function startVNCServer(session) {
  // 启动 VNC 服务器
  const vncserver = spawn('vncserver', [
    `:${session.display}`,
    '-geometry', session.resolution,
    '-SecurityTypes', 'VncAuth',
    '-PasswordFile', session.passwordFile
  ]);
  
  // 启动 websockify
  const websockify = spawn('websockify', [
    '--web=/opt/noVNC',
    session.websocketPort,
    `localhost:${session.vncPort}`
  ]);
  
  return { vncserver, websockify };
}
```

### 2. HPC 调度器集成

```javascript
// 提交作业到 Slurm
async function submitJob(session) {
  const script = generateBatchScript(session);
  const { stdout } = await execAsync(`sbatch ${script}`);
  const jobId = stdout.match(/Submitted batch job (\d+)/)[1];
  return jobId;
}
```

### 3. noVNC 集成

```html
<!-- 在前端添加 noVNC 客户端 -->
<iframe 
  src="/noVNC/vnc.html?host=HOST&port=PORT&password=PASS"
  style="width:100%;height:100%">
</iframe>
```

### 4. 数据持久化

```javascript
// 使用数据库存储会话
const { Pool } = require('pg');
const pool = new Pool({ /* config */ });

async function saveSession(session) {
  await pool.query(
    'INSERT INTO sessions (id, desktop, status, ...) VALUES ($1, $2, $3, ...)',
    [session.id, session.desktop, session.status, ...]
  );
}
```

## 开发指南

### 添加新的桌面环境

1. 在 `templates/desktops/` 目录下创建启动脚本：

```bash
#!/bin/bash
# templates/desktops/cinnamon.sh

echo "Starting Cinnamon Desktop..."
# 配置脚本
cinnamon-session
```

2. 在 `server/app.js` 中注册桌面环境：

```javascript
const desktopEnvironments = {
  // ...existing desktops
  cinnamon: {
    name: 'Cinnamon Desktop',
    description: 'Linux Mint desktop environment',
    icon: 'desktop',
    script: 'cinnamon.sh'
  }
};
```

3. 给脚本添加执行权限：

```bash
chmod +x templates/desktops/cinnamon.sh
```

### 自定义样式

修改 `public/css/style.css` 文件来自定义界面样式。

### 修改端口

在 `package.json` 或环境变量中设置：

```bash
PORT=3004 npm start
```

## 故障排除

### 常见问题

1. **端口已被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :3004
   
   # 或更改端口
   PORT=3005 npm start
   ```

2. **依赖安装失败**
   ```bash
   # 清除缓存
   npm cache clean --force
   
   # 重新安装
   npm install
   ```

3. **会话启动失败**
   - 检查服务器日志
   - 确认桌面环境已安装
   - 验证脚本执行权限

### 调试模式

```bash
# 启用详细日志
DEBUG=* npm start
```

## 技术栈

- **后端**: Node.js + Express
- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **VNC**: TurboVNC + Websockify（生产环境）
- **桌面**: MATE/Xfce/GNOME/KDE

## 功能状态

- [x] 真实 VNC 服务器集成 ✅
- [x] noVNC Web 客户端集成 ✅
- [x] 会话管理和状态跟踪 ✅
- [x] 多桌面环境支持 ✅
- [x] 资源配置 ✅
- [ ] HPC 调度器（Slurm/PBS）集成
- [ ] 数据库持久化
- [ ] 用户认证和授权
- [ ] 会话日志查看
- [ ] 文件传输功能
- [ ] 多用户支持
- [ ] 资源配额管理

## 许可证

MIT License

## 致谢

- [Open OnDemand](https://openondemand.org/) - 设计灵感和参考实现
- [noVNC](https://github.com/novnc/noVNC) - HTML5 VNC 客户端
- [TurboVNC](https://turbovnc.org/) - 高性能 VNC 服务器

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2025-01-29)
- 🎉 初始版本发布
- ✨ 支持 MATE、Xfce、GNOME、KDE 四种桌面环境
- ✨ 会话管理功能（创建、查看、停止、删除）
- ✨ 资源配置（分辨率、CPU、内存）
- 🎨 现代化响应式 UI 设计
- 📝 完整的 API 文档


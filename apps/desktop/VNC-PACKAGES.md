# VNC Packages 和技术栈说明

本文档详细说明 MiniDemand Desktop 应用使用的 VNC 相关 packages 和技术。

## 📦 Package 清单

### Node.js Dependencies (package.json)

```json
{
  "dependencies": {
    "express": "^5.1.0",       // Web 服务器框架
    "cors": "^2.8.5",          // CORS 支持
    "helmet": "^8.1.0",        // 安全头设置
    "uuid": "^9.0.0",          // 生成会话 ID
    "ws": "^8.14.0",           // WebSocket 库（用于未来扩展）
    "node-pty": "^1.0.0"       // 进程管理（用于未来扩展）
  }
}
```

### 系统级软件（非 npm）

#### 1. VNC 服务器

**TurboVNC** (推荐)
- **用途**: 高性能 VNC 服务器
- **版本**: 3.0.3+
- **安装**: 
  ```bash
  # RHEL/CentOS
  sudo yum install turbovnc
  
  # Ubuntu/Debian (需要从官网下载 .deb)
  wget https://sourceforge.net/projects/turbovnc/files/3.0.3/turbovnc_3.0.3_amd64.deb
  sudo dpkg -i turbovnc_3.0.3_amd64.deb
  ```
- **特点**: 
  - 专为远程桌面优化
  - 比 TigerVNC 快 2-4 倍
  - 支持硬件加速
- **文档**: https://turbovnc.org/

**TigerVNC** (备选)
- **用途**: 开源 VNC 服务器
- **版本**: 1.11+
- **安装**:
  ```bash
  # RHEL/CentOS
  sudo yum install tigervnc-server
  
  # Ubuntu/Debian
  sudo apt install tigervnc-standalone-server
  ```
- **特点**:
  - 广泛支持
  - 稳定可靠
  - 社区活跃
- **文档**: https://tigervnc.org/

**x11vnc** (备选)
- **用途**: X11 VNC 服务器
- **版本**: 0.9.16+
- **安装**:
  ```bash
  sudo yum install x11vnc  # RHEL/CentOS
  sudo apt install x11vnc  # Ubuntu/Debian
  ```
- **特点**:
  - 直接连接现有 X 会话
  - 轻量级
  - 适合调试
- **文档**: http://www.karlrunge.com/x11vnc/

#### 2. Websockify

**Websockify** (必需)
- **用途**: WebSocket 到 TCP 代理（VNC 协议转换）
- **版本**: 0.10.0+
- **语言**: Python
- **安装**:
  ```bash
  # 使用 pip
  pip install websockify
  
  # 或 pip3
  pip3 install websockify
  
  # 从源码
  git clone https://github.com/novnc/websockify
  cd websockify
  python setup.py install
  ```
- **作用**:
  - 将 VNC 的 RFB 协议转换为 WebSocket
  - 提供 Web 访问能力
  - 内置 HTTP 服务器（可选）
- **文档**: https://github.com/novnc/websockify
- **命令示例**:
  ```bash
  websockify --web=/path/to/noVNC 5901 localhost:5900
  ```

#### 3. noVNC Client

**noVNC** (必需)
- **用途**: HTML5 VNC 客户端
- **版本**: 1.4.0
- **语言**: JavaScript
- **安装**:
  ```bash
  # 通过我们的脚本
  npm run install-novnc
  
  # 或手动
  cd public
  wget https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.tar.gz
  tar -xzf v1.4.0.tar.gz
  mv noVNC-1.4.0 noVNC
  ```
- **特点**:
  - 纯浏览器实现
  - 支持 WebSocket
  - 触摸屏支持
  - 剪贴板同步
  - 文件传输（实验性）
- **文档**: https://github.com/novnc/noVNC
- **目录结构**:
  ```
  public/noVNC/
  ├── vnc.html          # 主界面
  ├── core/             # 核心库
  ├── app/              # 应用代码
  └── vendor/           # 第三方库
  ```

## 🏗️ 架构和数据流

### 完整架构

```
用户浏览器
    ↓ (HTTPS/WSS)
MiniDemand Desktop App (Node.js/Express)
    ↓ (启动和管理)
┌──────────────────┬─────────────────────┐
│   Websockify     │   VNC Server        │
│   (Python)       │   (TurboVNC/Tiger)  │
│   Port: 5901+    │   Port: 5900+       │
└──────────────────┴─────────────────────┘
           ↓
    Desktop Session
    (MATE/Xfce/GNOME/KDE)
```

### 详细数据流

1. **会话创建**
   ```
   用户 → Express Server
      → POST /api/sessions
      → VNC Manager (vnc-manager.js)
      → spawn vncserver :1
      → spawn websockify 5901 localhost:5900
   ```

2. **连接建立**
   ```
   用户点击"连接" → 打开 /vnc.html?session=xxx
      → 加载 noVNC 客户端
      → 获取连接信息 (GET /api/sessions/:id/vnc)
      → 连接 WebSocket (ws://hostname:5901)
      → Websockify 转发到 VNC Server
      → 显示桌面画面
   ```

3. **交互**
   ```
   用户输入 (键盘/鼠标)
      → noVNC 客户端
      → WebSocket
      → Websockify
      → VNC Server (RFB 协议)
      → X11 Desktop
      → 屏幕更新
      → VNC Server
      → Websockify
      → WebSocket
      → noVNC 客户端
      → 浏览器渲染
   ```

## 🔌 协议说明

### RFB (Remote Framebuffer) 协议

VNC 使用的底层协议:
- **端口**: 5900 + display_number
- **特点**:
  - 基于 TCP
  - 传输屏幕帧
  - 支持多种编码（Raw, CopyRect, RRE, Hextile, ZRLE, Tight）
- **安全**: 可选密码认证、加密

### WebSocket 协议

Websockify 提供的协议转换:
- **端口**: 自定义（如 5901）
- **特点**:
  - 基于 HTTP Upgrade
  - 全双工通信
  - 支持二进制数据
- **URL 格式**: `ws://host:port/websockify` 或 `wss://` (SSL)

## 📝 为什么需要这些组件

### 1. 为什么需要 VNC Server？

**问题**: 桌面环境运行在服务器上，但用户在远程
**解决**: VNC Server 捕获 X11 桌面画面，通过网络传输

### 2. 为什么需要 Websockify？

**问题**: VNC 使用 RFB 协议，浏览器只支持 HTTP/WebSocket
**解决**: Websockify 将 RFB 协议转换为 WebSocket，使浏览器能访问

### 3. 为什么需要 noVNC？

**问题**: 需要在浏览器中渲染 VNC 画面
**解决**: noVNC 是纯 JavaScript 的 VNC 客户端，直接在浏览器中运行

### 4. 为什么不使用 npm 的 VNC packages？

存在一些 npm VNC packages，但它们通常：
- 功能有限（node-vnc, rfb2）
- 不够成熟
- 性能较差
- 缺少维护

而系统级的 VNC Server (TurboVNC/TigerVNC)：
- 经过多年优化
- 广泛使用
- 性能优秀
- 稳定可靠

## 🔄 替代方案

### 使用 npm 的 VNC packages（不推荐用于生产）

```json
{
  "dependencies": {
    "node-vnc": "^1.0.0",     // VNC 客户端库
    "rfb2": "^0.2.0",         // RFB 协议实现
    "node-x11": "^2.3.0"      // X11 协议库
  }
}
```

**优点**:
- 纯 Node.js 实现
- 无需系统依赖
- 易于安装

**缺点**:
- 功能受限
- 性能较差
- 不成熟
- 缺少维护

### 其他远程桌面方案

1. **RDP (Remote Desktop Protocol)**
   - Windows 原生
   - 需要 xrdp 服务器
   - 性能较好

2. **X2Go**
   - 基于 NX 技术
   - 低带宽优化
   - 需要额外配置

3. **NoMachine**
   - 商业软件（有免费版）
   - 性能优秀
   - 功能丰富

## 💡 最佳实践

### 生产环境推荐配置

```bash
# 1. 使用 TurboVNC（性能最佳）
sudo yum install turbovnc

# 2. 使用最新版 Websockify
pip3 install --upgrade websockify

# 3. 使用轻量桌面环境
sudo yum groupinstall "MATE Desktop"  # 或 Xfce

# 4. 配置 SSL
websockify --cert=/path/to/cert.pem --key=/path/to/key.pem 5901 localhost:5900

# 5. 使用反向代理（Nginx/Apache）
```

### 开发环境快速设置

```bash
# 1. 使用模拟模式（无需 VNC）
npm start

# 2. 或使用 TigerVNC（易安装）
sudo apt install tigervnc-standalone-server
pip3 install websockify
npm run install-novnc
USE_REAL_VNC=true npm start
```

## 📚 延伸阅读

- [VNC 协议规范](https://www.rfc-editor.org/rfc/rfc6143.html)
- [WebSocket 协议](https://www.rfc-editor.org/rfc/rfc6455.html)
- [X Window System](https://www.x.org/)
- [Open OnDemand 架构](https://osc.github.io/ood-documentation/latest/architecture.html)

## ❓ 常见问题

**Q: 能否完全用 Node.js 实现，不依赖系统软件？**
A: 技术上可行，但性能和稳定性会大打折扣。VNC 服务器需要深度集成 X11，这是系统级软件的强项。

**Q: 为什么不直接使用 RDP？**
A: RDP 是 Windows 原生协议，在 Linux 上需要 xrdp 转换，且 Open OnDemand 生态主要基于 VNC。

**Q: noVNC 的性能如何？**
A: 对于办公应用足够，但不适合视频编辑等高帧率需求。可以通过调整压缩和质量参数优化。

**Q: 是否支持 GPU 加速？**
A: TurboVNC 支持 VirtualGL 进行 OpenGL 加速，但需要额外配置。

---

**总结**: MiniDemand Desktop 使用成熟的开源技术栈（TurboVNC/TigerVNC + Websockify + noVNC），确保性能和稳定性。Node.js 部分负责会话管理和协调，真正的 VNC 服务由专业软件提供。


# Desktop App 安装和配置指南

本文档介绍如何为 MiniDemand Desktop 应用配置真实的 VNC 功能。

## 📋 目录

1. [系统要求](#系统要求)
2. [安装依赖](#安装依赖)
3. [配置 VNC 服务器](#配置-vnc-服务器)
4. [安装 noVNC](#安装-novnc)
5. [启动应用](#启动应用)
6. [验证安装](#验证安装)
7. [故障排除](#故障排除)

---

## 系统要求

### 必需软件

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **VNC 服务器**（以下之一）:
  - TurboVNC (推荐)
  - TigerVNC
  - x11vnc
- **Websockify** - WebSocket 代理
- **Python** >= 3.6 (用于 websockify)
- **桌面环境**（至少一个）:
  - MATE Desktop
  - Xfce Desktop
  - GNOME Desktop
  - KDE Plasma

### 可选软件

- **X11 Display Server** (Xorg)

---

## 安装依赖

### 1. Node.js 依赖

```bash
cd apps/desktop
npm install
```

### 2. VNC 服务器

#### RHEL/CentOS/AlmaLinux

```bash
# TurboVNC (推荐 - 高性能)
sudo yum install -y https://sourceforge.net/projects/turbovnc/files/3.0.3/turbovnc-3.0.3.x86_64.rpm

# 或 TigerVNC
sudo yum install -y tigervnc-server

# 或 x11vnc
sudo yum install -y x11vnc
```

#### Ubuntu/Debian

```bash
# TigerVNC
sudo apt update
sudo apt install -y tigervnc-standalone-server tigervnc-common

# 或 x11vnc
sudo apt install -y x11vnc

# 或 TurboVNC (从官网下载 .deb 包)
wget https://sourceforge.net/projects/turbovnc/files/3.0.3/turbovnc_3.0.3_amd64.deb
sudo dpkg -i turbovnc_3.0.3_amd64.deb
```

### 3. Websockify

```bash
# 使用 pip 安装
pip install websockify

# 或使用 pip3
pip3 install websockify

# 或从源码安装
git clone https://github.com/novnc/websockify.git
cd websockify
python setup.py install
```

验证安装:
```bash
which websockify
websockify --version
```

### 4. 桌面环境

#### MATE (推荐 - 轻量)

```bash
# RHEL/CentOS
sudo yum groupinstall -y "MATE Desktop"

# Ubuntu/Debian
sudo apt install -y mate-desktop-environment mate-desktop-environment-extras
```

#### Xfce (推荐 - 轻量)

```bash
# RHEL/CentOS
sudo yum groupinstall -y "Xfce"

# Ubuntu/Debian
sudo apt install -y xfce4 xfce4-goodies
```

#### GNOME

```bash
# RHEL/CentOS
sudo yum groupinstall -y "GNOME Desktop"

# Ubuntu/Debian
sudo apt install -y ubuntu-desktop
```

#### KDE Plasma

```bash
# RHEL/CentOS
sudo yum groupinstall -y "KDE Plasma Workspaces"

# Ubuntu/Debian
sudo apt install -y kde-plasma-desktop
```

---

## 配置 VNC 服务器

### 1. 设置 VNC 密码

```bash
vncpasswd
```

这会在 `~/.vnc/passwd` 创建密码文件。

### 2. 配置 xstartup (可选)

应用会自动管理 xstartup，但你也可以创建默认配置：

```bash
mkdir -p ~/.vnc
cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec /bin/bash
EOF

chmod +x ~/.vnc/xstartup
```

### 3. 测试 VNC 服务器

```bash
# 启动 VNC 服务器
vncserver :1 -geometry 1920x1080

# 检查是否运行
ps aux | grep vnc

# 停止 VNC 服务器
vncserver -kill :1
```

---

## 安装 noVNC

### 自动安装

```bash
cd apps/desktop
npm run install-novnc
```

### 手动安装

```bash
cd apps/desktop/public
wget https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.tar.gz
tar -xzf v1.4.0.tar.gz
mv noVNC-1.4.0 noVNC
rm v1.4.0.tar.gz
```

验证安装:
```bash
ls apps/desktop/public/noVNC/vnc.html
```

---

## 启动应用

### 开发模式（模拟 VNC）

```bash
npm start
```

访问: http://localhost:3004

### 生产模式（真实 VNC）

```bash
USE_REAL_VNC=true npm start
```

或设置环境变量:
```bash
export USE_REAL_VNC=true
npm start
```

---

## 验证安装

### 1. 检查依赖

```bash
# VNC 服务器
which vncserver || which Xvnc || which x11vnc

# Websockify
which websockify

# Node模块
cd apps/desktop && npm list
```

### 2. 测试会话创建

1. 打开浏览器访问 http://localhost:3004
2. 选择桌面环境（推荐 MATE 或 Xfce）
3. 点击"启动桌面会话"
4. 等待会话状态变为"运行中"
5. 点击"连接桌面"

### 3. 检查日志

```bash
# 查看服务器日志
# 应该看到类似输出:
# VNC server started on display :1
# Websockify started on port 5901
```

---

## 故障排除

### 问题 1: "No VNC server found"

**原因**: 未安装 VNC 服务器

**解决**:
```bash
# 安装 TigerVNC
sudo yum install tigervnc-server  # RHEL/CentOS
sudo apt install tigervnc-standalone-server  # Ubuntu/Debian
```

### 问题 2: "Websockify not found"

**原因**: 未安装 websockify

**解决**:
```bash
pip install websockify
# 或
pip3 install websockify
```

### 问题 3: "noVNC 客户端未安装"

**原因**: noVNC 文件不存在

**解决**:
```bash
cd apps/desktop
npm run install-novnc
```

### 问题 4: 桌面无法启动

**原因**: 缺少桌面环境或 X11

**解决**:
```bash
# 安装 MATE 桌面
sudo yum groupinstall "MATE Desktop"

# 安装 X11
sudo yum install xorg-x11-server-Xorg
```

### 问题 5: 端口冲突

**原因**: VNC 或 WebSocket 端口被占用

**解决**:
```bash
# 查找占用端口的进程
lsof -i :5901
lsof -i :3004

# 杀死进程或更改端口
PORT=3005 USE_REAL_VNC=true npm start
```

### 问题 6: 权限错误

**原因**: 无法创建 /tmp 文件

**解决**:
```bash
# 检查 /tmp 权限
ls -ld /tmp

# 清理旧的 VNC 文件
rm -rf /tmp/.X11-unix/X*
rm -rf /tmp/vnc-*
```

### 问题 7: 连接超时

**原因**: 防火墙阻止连接

**解决**:
```bash
# 开放端口 (如果使用 firewalld)
sudo firewall-cmd --add-port=5900-6000/tcp --permanent
sudo firewall-cmd --reload

# 或临时禁用防火墙测试
sudo systemctl stop firewalld
```

---

## 高级配置

### 1. 自定义 VNC 参数

编辑 `server/vnc-manager.js`，修改 VNC 启动参数：

```javascript
const vncserver = spawn('vncserver', [
  displayStr,
  '-geometry', session.resolution,
  '-depth', '24',
  '-dpi', '96',  // 添加 DPI 设置
  '-SecurityTypes', 'VncAuth',
  '-PasswordFile', passwordFile
]);
```

### 2. 配置 Websockify SSL

```javascript
const websockify = spawn('websockify', [
  '--web', noVNCPath,
  '--cert', '/path/to/cert.pem',
  '--key', '/path/to/key.pem',
  session.port.toString(),
  `localhost:${vncPort}`
]);
```

### 3. 使用不同的 VNC 服务器

修改 `server/vnc-manager.js` 中的 `commandExists` 检查顺序:

```javascript
// 优先使用 TurboVNC
if (await this.commandExists('turbovnc')) {
  vncCommand = 'turbovnc';
} else if (await this.commandExists('vncserver')) {
  vncCommand = 'vncserver';
}
```

---

## 性能优化

### 1. 使用 TurboVNC

TurboVNC 比 TigerVNC 快 2-4 倍:

```bash
# 安装 TurboVNC
sudo yum install turbovnc
```

### 2. 调整压缩和质量

在 noVNC 连接页面可以调整:
- 压缩级别: 1-9 (默认: 2)
- 图像质量: 0-9 (默认: 6)

### 3. 使用轻量桌面环境

推荐使用 MATE 或 Xfce 而非 GNOME 或 KDE:

```bash
# MATE 内存占用: ~500MB
# Xfce 内存占用: ~400MB
# GNOME 内存占用: ~1GB
# KDE 内存占用: ~800MB
```

---

## 生产环境部署

### 1. 使用进程管理器

```bash
# 使用 PM2
npm install -g pm2
pm2 start server/app.js --name desktop-app -i 2
pm2 save

# 或使用 systemd
sudo cp desktop.service /etc/systemd/system/
sudo systemctl enable desktop
sudo systemctl start desktop
```

### 2. 配置反向代理

使用 Nginx 反向代理:

```nginx
upstream desktop_app {
    server localhost:3004;
}

server {
    listen 80;
    server_name desktop.example.com;

    location / {
        proxy_pass http://desktop_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 3. 配置 SSL

```nginx
server {
    listen 443 ssl;
    server_name desktop.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://desktop_app;
        # ... 其他配置
    }
}
```

---

## 安全建议

1. **使用强密码** - VNC 密码应该足够复杂
2. **启用 SSL/TLS** - 生产环境必须使用 HTTPS
3. **限制访问** - 使用防火墙限制 VNC 端口访问
4. **定期更新** - 保持 VNC 服务器和依赖更新
5. **审计日志** - 记录所有会话创建和连接

---

## 参考资料

- [TurboVNC 官网](https://turbovnc.org/)
- [TigerVNC 文档](https://tigervnc.org/)
- [noVNC GitHub](https://github.com/novnc/noVNC)
- [Websockify GitHub](https://github.com/novnc/websockify)
- [Open OnDemand 文档](https://osc.github.io/ood-documentation/)

---

**需要帮助?** 查看 [README.md](README.md) 或提交 Issue。


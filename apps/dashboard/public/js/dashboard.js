class Dashboard {
    constructor() {
        this.apps = [];
        this.refreshInterval = null;
    }

    async init() {
        this.setupEventListeners();
        await this.loadApps();
        this.startAutoRefresh();
        this.updateSystemInfo();
    }

    setupEventListeners() {
        document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
    }

    async loadApps() {
        try {
            const response = await fetch('/api/apps');
            const data = await response.json();
            
            if (response.ok) {
                this.apps = data;
                this.renderApps();
            } else {
                this.showError('加载应用列表失败: ' + data.error);
            }
        } catch (error) {
            this.showError('网络错误: ' + error.message);
        }
    }

    renderApps() {
        const appsGrid = document.getElementById('apps-grid');
        appsGrid.innerHTML = '';

        this.apps.forEach(app => {
            const appCard = this.createAppCard(app);
            appsGrid.appendChild(appCard);
        });
    }

    createAppCard(app) {
        const card = document.createElement('div');
        card.className = 'app-card';
        card.onclick = () => window.open(`http://127.0.0.1:${app.port}`, '_blank');

        const status = this.getAppStatus(app);
        const iconClass = this.getAppIcon(app);

        card.innerHTML = `
            <div class="app-card-header">
                <div class="app-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="app-info">
                    <h4>${app.name || app.id}</h4>
                    <span class="app-category">${app.category || '应用'}</span>
                </div>
            </div>
            <div class="app-description">
                ${app.description || '暂无描述'}
            </div>
            <div class="app-actions">
                <span class="app-status ${status.class}">
                    <i class="fas fa-circle"></i>
                    ${status.text}
                </span>
                <button class="btn btn-primary btn-sm" onclick="window.open('http://127.0.0.1:${app.port}', '_blank')">
                    <i class="fas fa-external-link-alt"></i>
                    打开
                </button>
            </div>
        `;

        return card;
    }

    getAppIcon(app) {
        const iconMap = {
            'shell': 'fas fa-terminal',
            'files': 'fas fa-folder',
            'dashboard': 'fas fa-tachometer-alt',
            'jobs': 'fas fa-magic'
        };
        return iconMap[app.id] || 'fas fa-cube';
    }

    async getAppStatus(app) {
        try {
            const response = await fetch(`http://localhost:${app.port}/api/status`, {
                method: 'GET',
                mode: 'no-cors'
            });
            return { class: 'running', text: '运行中' };
        } catch (error) {
            return { class: 'stopped', text: '已停止' };
        }
    }

    async updateSystemInfo() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('server-status').textContent = '运行正常';
                document.getElementById('uptime').textContent = this.formatUptime(data.uptime);
                document.getElementById('version').textContent = data.version;
            } else {
                document.getElementById('server-status').textContent = '状态未知';
            }
        } catch (error) {
            document.getElementById('server-status').textContent = '连接失败';
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}天 ${hours}小时`;
        } else if (hours > 0) {
            return `${hours}小时 ${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.updateSystemInfo();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async refresh() {
        this.showLoading();
        await this.loadApps();
        this.updateSystemInfo();
        this.hideLoading();
    }

    showLoading() {
        const refreshBtn = document.getElementById('refresh-btn');
        const icon = refreshBtn.querySelector('i');
        icon.className = 'fas fa-sync-alt loading';
        refreshBtn.disabled = true;
    }

    hideLoading() {
        const refreshBtn = document.getElementById('refresh-btn');
        const icon = refreshBtn.querySelector('i');
        icon.className = 'fas fa-sync-alt';
        refreshBtn.disabled = false;
    }

    showError(message) {
        console.error('Dashboard Error:', message);
        // TODO: Show user-friendly error message
    }

    // Cleanup when page unloads
    destroy() {
        this.stopAutoRefresh();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});

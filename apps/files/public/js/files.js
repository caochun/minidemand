class FileManager {
    constructor() {
        this.currentPath = '/Users/chun';
        this.history = [];
        this.historyIndex = -1;
        this.selectedFiles = new Set();
        this.viewMode = 'grid'; // 'grid' or 'list'
        this.favorites = [
            { name: '主目录', path: '/Users/chun', icon: 'fas fa-home' },
            { name: '桌面', path: '/Users/chun/Desktop', icon: 'fas fa-desktop' },
            { name: '文档', path: '/Users/chun/Documents', icon: 'fas fa-file-alt' },
            { name: '下载', path: '/Users/chun/Downloads', icon: 'fas fa-download' }
        ];
    }

    init() {
        this.setupEventListeners();
        this.loadDirectory(this.currentPath);
        this.updateBreadcrumb();
    }

    setupEventListeners() {
        // Header buttons
        document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
        document.getElementById('new-file-btn').addEventListener('click', () => this.showNewFileModal());
        document.getElementById('new-dir-btn').addEventListener('click', () => this.showNewDirModal());
        document.getElementById('upload-btn').addEventListener('click', () => this.uploadFiles());
        document.getElementById('download-btn').addEventListener('click', () => this.downloadSelected());

        // Toolbar buttons
        document.getElementById('back-btn').addEventListener('click', () => this.goBack());
        document.getElementById('forward-btn').addEventListener('click', () => this.goForward());
        document.getElementById('up-btn').addEventListener('click', () => this.goUp());
        document.getElementById('list-view-btn').addEventListener('click', () => this.setViewMode('list'));
        document.getElementById('grid-view-btn').addEventListener('click', () => this.setViewMode('grid'));

        // Modal
        document.getElementById('modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideModal();
        });

        // File upload
        document.getElementById('file-upload-input').addEventListener('change', (e) => this.handleFileUpload(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async loadDirectory(path) {
        try {
            this.showLoading();
            const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
            const data = await response.json();
            
            if (response.ok) {
                this.currentPath = data.path;
                this.renderFileList(data.files);
                this.updateBreadcrumb();
                this.updateHistory();
            } else {
                this.showError('加载目录失败: ' + data.error);
            }
        } catch (error) {
            this.showError('网络错误: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderFileList(files) {
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';

        files.forEach(file => {
            const fileItem = this.createFileItem(file);
            fileList.appendChild(fileItem);
        });

        this.updateViewMode();
    }

    createFileItem(file) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.path = file.path;
        item.dataset.type = file.type;

        const icon = this.getFileIcon(file);
        const size = this.formatFileSize(file.size);
        const modified = this.formatDate(file.modified);

        item.innerHTML = `
            <div class="file-icon ${this.getFileIconClass(file)}">
                <i class="${icon}"></i>
            </div>
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-meta">
                <span class="file-size">${size}</span>
                <span class="file-modified">${modified}</span>
            </div>
        `;

        // Event listeners
        item.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey) {
                this.toggleSelection(file.path);
            } else {
                this.openFile(file);
            }
        });

        item.addEventListener('dblclick', () => this.openFile(file));

        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, file);
        });

        return item;
    }

    getFileIcon(file) {
        if (file.type === 'directory') {
            return 'fas fa-folder';
        }

        const ext = file.name.split('.').pop().toLowerCase();
        const iconMap = {
            // Images
            'jpg': 'fas fa-image', 'jpeg': 'fas fa-image', 'png': 'fas fa-image',
            'gif': 'fas fa-image', 'bmp': 'fas fa-image', 'svg': 'fas fa-image',
            'webp': 'fas fa-image', 'ico': 'fas fa-image',
            
            // Documents
            'pdf': 'fas fa-file-pdf', 'doc': 'fas fa-file-word', 'docx': 'fas fa-file-word',
            'xls': 'fas fa-file-excel', 'xlsx': 'fas fa-file-excel', 'ppt': 'fas fa-file-powerpoint',
            'pptx': 'fas fa-file-powerpoint', 'txt': 'fas fa-file-alt', 'rtf': 'fas fa-file-alt',
            
            // Code
            'js': 'fas fa-file-code', 'html': 'fas fa-file-code', 'css': 'fas fa-file-code',
            'php': 'fas fa-file-code', 'py': 'fas fa-file-code', 'java': 'fas fa-file-code',
            'cpp': 'fas fa-file-code', 'c': 'fas fa-file-code', 'h': 'fas fa-file-code',
            'json': 'fas fa-file-code', 'xml': 'fas fa-file-code', 'yaml': 'fas fa-file-code',
            'yml': 'fas fa-file-code', 'md': 'fas fa-file-alt',
            
            // Archives
            'zip': 'fas fa-file-archive', 'rar': 'fas fa-file-archive', '7z': 'fas fa-file-archive',
            'tar': 'fas fa-file-archive', 'gz': 'fas fa-file-archive',
            
            // Audio/Video
            'mp3': 'fas fa-file-audio', 'wav': 'fas fa-file-audio', 'mp4': 'fas fa-file-video',
            'avi': 'fas fa-file-video', 'mov': 'fas fa-file-video', 'mkv': 'fas fa-file-video'
        };

        return iconMap[ext] || 'fas fa-file';
    }

    getFileIconClass(file) {
        if (file.type === 'directory') return 'directory';
        
        const ext = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) {
            return 'image';
        }
        if (['txt', 'md', 'rtf'].includes(ext)) {
            return 'text';
        }
        if (['js', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c', 'h', 'json', 'xml', 'yaml', 'yml'].includes(ext)) {
            return 'code';
        }
        return 'file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return '今天';
        if (diffDays === 2) return '昨天';
        if (diffDays <= 7) return `${diffDays}天前`;
        
        return date.toLocaleDateString('zh-CN');
    }

    openFile(file) {
        if (file.type === 'directory') {
            this.loadDirectory(file.path);
        } else {
            this.openFileEditor(file);
        }
    }

    async openFileEditor(file) {
        try {
            const response = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
            const data = await response.json();
            
            if (response.ok) {
                this.showFileEditor(file, data.content);
            } else {
                this.showError('无法打开文件: ' + data.error);
            }
        } catch (error) {
            this.showError('网络错误: ' + error.message);
        }
    }

    showFileEditor(file, content) {
        const modal = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const contentDiv = document.getElementById('modal-content');

        title.textContent = `编辑文件: ${file.name}`;
        contentDiv.innerHTML = `
            <div class="form-group">
                <label>文件路径:</label>
                <input type="text" id="edit-file-path" value="${file.path}" readonly>
            </div>
            <div class="form-group">
                <label>文件内容:</label>
                <textarea id="edit-file-content" rows="20">${content}</textarea>
            </div>
            <div class="form-group">
                <button id="save-file-btn" class="btn btn-outline">
                    <i class="fas fa-save"></i> 保存
                </button>
                <button id="cancel-edit-btn" class="btn">
                    <i class="fas fa-times"></i> 取消
                </button>
            </div>
        `;

        modal.classList.remove('hidden');

        // Event listeners for editor
        document.getElementById('save-file-btn').addEventListener('click', () => this.saveFile(file.path));
        document.getElementById('cancel-edit-btn').addEventListener('click', () => this.hideModal());
    }

    async saveFile(filePath) {
        const content = document.getElementById('edit-file-content').value;
        
        try {
            const response = await fetch('/api/files/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: filePath, content })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.hideModal();
                this.showSuccess('文件保存成功');
            } else {
                this.showError('保存失败: ' + data.error);
            }
        } catch (error) {
            this.showError('网络错误: ' + error.message);
        }
    }

    showNewFileModal() {
        this.showInputModal('新建文件', '请输入文件名:', (name) => this.createFile(name));
    }

    showNewDirModal() {
        this.showInputModal('新建文件夹', '请输入文件夹名:', (name) => this.createDirectory(name));
    }

    showInputModal(title, message, callback) {
        const modal = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const contentDiv = document.getElementById('modal-content');

        titleEl.textContent = title;
        contentDiv.innerHTML = `
            <p>${message}</p>
            <div class="form-group">
                <input type="text" id="input-value" placeholder="输入名称..." autofocus>
            </div>
            <div class="form-group">
                <button id="confirm-btn" class="btn btn-outline">
                    <i class="fas fa-check"></i> 确定
                </button>
                <button id="cancel-btn" class="btn">
                    <i class="fas fa-times"></i> 取消
                </button>
            </div>
        `;

        modal.classList.remove('hidden');

        const input = document.getElementById('input-value');
        input.focus();

        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        const handleConfirm = () => {
            const value = input.value.trim();
            if (value) {
                callback(value);
                this.hideModal();
            }
        };

        const handleCancel = () => {
            this.hideModal();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') handleCancel();
        });
    }

    async createFile(name) {
        const filePath = `${this.currentPath}/${name}`;
        await this.createItem(filePath, 'file');
    }

    async createDirectory(name) {
        const dirPath = `${this.currentPath}/${name}`;
        await this.createItem(dirPath, 'directory');
    }

    async createItem(path, type) {
        try {
            const response = await fetch('/api/files/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, type })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.refresh();
                this.showSuccess(`${type === 'file' ? '文件' : '文件夹'}创建成功`);
            } else {
                this.showError('创建失败: ' + data.error);
            }
        } catch (error) {
            this.showError('网络错误: ' + error.message);
        }
    }

    uploadFiles() {
        document.getElementById('file-upload-input').click();
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        // TODO: Implement file upload
        console.log('Upload files:', files);
        this.showSuccess(`准备上传 ${files.length} 个文件`);
    }

    downloadSelected() {
        if (this.selectedFiles.size === 0) {
            this.showError('请先选择要下载的文件');
            return;
        }
        // TODO: Implement file download
        console.log('Download files:', Array.from(this.selectedFiles));
    }

    toggleSelection(filePath) {
        if (this.selectedFiles.has(filePath)) {
            this.selectedFiles.delete(filePath);
        } else {
            this.selectedFiles.add(filePath);
        }
        this.updateSelection();
    }

    updateSelection() {
        document.querySelectorAll('.file-item').forEach(item => {
            if (this.selectedFiles.has(item.dataset.path)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.updateViewMode();
        
        document.getElementById('list-view-btn').classList.toggle('active', mode === 'list');
        document.getElementById('grid-view-btn').classList.toggle('active', mode === 'grid');
    }

    updateViewMode() {
        const fileList = document.getElementById('file-list');
        fileList.className = `file-list ${this.viewMode}-view`;
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb-list');
        const parts = this.currentPath.split('/').filter(part => part);
        
        breadcrumb.innerHTML = '<li><a href="#" data-path="/"><i class="fas fa-home"></i></a></li>';
        
        let currentPath = '';
        parts.forEach((part, index) => {
            currentPath += '/' + part;
            const isLast = index === parts.length - 1;
            const link = isLast ? `<span>${part}</span>` : `<a href="#" data-path="${currentPath}">${part}</a>`;
            breadcrumb.innerHTML += `<li>${link}</li>`;
        });

        // Add event listeners to breadcrumb links
        breadcrumb.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadDirectory(link.dataset.path);
            });
        });
    }

    updateHistory() {
        // Remove any history after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(this.currentPath);
        this.historyIndex = this.history.length - 1;
        
        // Update navigation buttons
        document.getElementById('back-btn').disabled = this.historyIndex <= 0;
        document.getElementById('forward-btn').disabled = this.historyIndex >= this.history.length - 1;
    }

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadDirectory(this.history[this.historyIndex]);
        }
    }

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadDirectory(this.history[this.historyIndex]);
        }
    }

    goUp() {
        const parentPath = this.currentPath.split('/').slice(0, -1).join('/') || '/';
        this.loadDirectory(parentPath);
    }

    refresh() {
        this.loadDirectory(this.currentPath);
    }

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    showLoading() {
        // TODO: Show loading indicator
    }

    hideLoading() {
        // TODO: Hide loading indicator
    }

    showError(message) {
        // TODO: Show error message
        alert('错误: ' + message);
    }

    showSuccess(message) {
        // TODO: Show success message
        console.log('成功: ' + message);
    }

    showContextMenu(event, file) {
        // TODO: Show context menu
        console.log('Context menu for:', file);
    }

    handleKeyboard(event) {
        if (event.key === 'F5') {
            event.preventDefault();
            this.refresh();
        }
        if (event.key === 'Escape') {
            this.hideModal();
        }
    }
}

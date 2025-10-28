class JobManager {
    constructor() {
        this.jobs = [];
        this.templates = [];
        this.clusters = [];
        this.selectedJobs = new Set();
        this.currentFilter = 'all';
        this.currentJob = null;
    }

    async init() {
        this.setupEventListeners();
        await this.loadTemplates();
        await this.loadClusters();
        await this.loadJobs();
        this.renderJobs();
        this.renderTemplates();
    }

    setupEventListeners() {
        // Header buttons
        document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
        document.getElementById('new-job-btn').addEventListener('click', () => this.showNewJobModal());

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.status));
        });

        // Job actions
        document.getElementById('submit-selected-btn').addEventListener('click', () => this.submitSelectedJobs());
        document.getElementById('cancel-selected-btn').addEventListener('click', () => this.cancelSelectedJobs());
        document.getElementById('delete-selected-btn').addEventListener('click', () => this.deleteSelectedJobs());

        // Modal
        document.getElementById('close-modal-btn').addEventListener('click', () => this.hideNewJobModal());
        document.getElementById('cancel-job-btn').addEventListener('click', () => this.hideNewJobModal());
        document.getElementById('new-job-form').addEventListener('submit', (e) => this.createJob(e));

        // Job details
        document.getElementById('close-details-btn').addEventListener('click', () => this.hideJobDetails());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Template selection
        document.getElementById('job-template-select').addEventListener('change', (e) => this.onTemplateSelect(e));

        // Template management
        document.getElementById('new-template-btn').addEventListener('click', () => this.showNewTemplateModal());
        document.getElementById('manage-templates-btn').addEventListener('click', () => this.showTemplateManagementModal());
        document.getElementById('close-template-modal-btn').addEventListener('click', () => this.hideTemplateManagementModal());
        document.getElementById('add-template-btn').addEventListener('click', () => this.showNewTemplateModal());
        document.getElementById('template-search').addEventListener('input', (e) => this.filterTemplates(e.target.value));

        // Template form
        document.getElementById('close-template-form-btn').addEventListener('click', () => this.hideTemplateFormModal());
        document.getElementById('cancel-template-btn').addEventListener('click', () => this.hideTemplateFormModal());
        document.getElementById('template-form').addEventListener('submit', (e) => this.saveTemplate(e));
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const data = await response.json();
            this.templates = data;
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    async loadClusters() {
        try {
            const response = await fetch('/api/clusters');
            const data = await response.json();
            this.clusters = data;
        } catch (error) {
            console.error('Error loading clusters:', error);
        }
    }

    async loadJobs() {
        try {
            const response = await fetch('/api/jobs');
            const data = await response.json();
            this.jobs = data;
        } catch (error) {
            console.error('Error loading jobs:', error);
        }
    }

    renderJobs() {
        const jobList = document.getElementById('job-list');
        jobList.innerHTML = '';

        const filteredJobs = this.getFilteredJobs();
        
        if (filteredJobs.length === 0) {
            jobList.innerHTML = '<div class="text-center text-muted">没有找到作业</div>';
            return;
        }

        filteredJobs.forEach(job => {
            const jobItem = this.createJobItem(job);
            jobList.appendChild(jobItem);
        });

        this.updateJobActions();
    }

    createJobItem(job) {
        const item = document.createElement('div');
        item.className = `job-item ${job.status}`;
        item.dataset.jobId = job.id;

        const statusClass = this.getStatusClass(job.status);
        const createdDate = new Date(job.createdAt).toLocaleString('zh-CN');

        item.innerHTML = `
            <div class="job-header">
                <div class="job-name">${job.name}</div>
                <div class="job-status ${statusClass}">${this.getStatusText(job.status)}</div>
            </div>
            <div class="job-meta">
                <span><i class="fas fa-server"></i> ${job.cluster}</span>
                <span><i class="fas fa-clock"></i> ${createdDate}</span>
                ${job.slurmJobId ? `<span><i class="fas fa-tag"></i> ${job.slurmJobId}</span>` : ''}
            </div>
            <div class="job-actions-inline">
                <button class="btn btn-sm btn-primary" onclick="jobManager.viewJob('${job.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-success" onclick="jobManager.submitJob('${job.id}')" ${job.status !== 'pending' ? 'disabled' : ''}>
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="jobManager.cancelJob('${job.id}')" ${!['submitted', 'running'].includes(job.status) ? 'disabled' : ''}>
                    <i class="fas fa-stop"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="jobManager.deleteJob('${job.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Selection handling
        item.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            
            if (e.ctrlKey || e.metaKey) {
                this.toggleJobSelection(job.id);
            } else {
                this.selectJob(job.id);
            }
        });

        return item;
    }

    getFilteredJobs() {
        if (this.currentFilter === 'all') {
            return this.jobs;
        }
        return this.jobs.filter(job => job.status === this.currentFilter);
    }

    getStatusClass(status) {
        const statusMap = {
            'pending': 'pending',
            'submitted': 'submitted',
            'running': 'running',
            'completed': 'completed',
            'failed': 'failed',
            'cancelled': 'cancelled'
        };
        return statusMap[status] || 'pending';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待提交',
            'submitted': '已提交',
            'running': '运行中',
            'completed': '已完成',
            'failed': '失败',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }

    setFilter(status) {
        this.currentFilter = status;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === status);
        });
        this.renderJobs();
    }

    toggleJobSelection(jobId) {
        if (this.selectedJobs.has(jobId)) {
            this.selectedJobs.delete(jobId);
        } else {
            this.selectedJobs.add(jobId);
        }
        this.updateJobSelection();
    }

    selectJob(jobId) {
        this.selectedJobs.clear();
        this.selectedJobs.add(jobId);
        this.updateJobSelection();
        this.viewJob(jobId);
    }

    updateJobSelection() {
        document.querySelectorAll('.job-item').forEach(item => {
            const jobId = item.dataset.jobId;
            item.classList.toggle('selected', this.selectedJobs.has(jobId));
        });
        this.updateJobActions();
    }

    updateJobActions() {
        const hasSelection = this.selectedJobs.size > 0;
        const canSubmit = Array.from(this.selectedJobs).some(id => {
            const job = this.jobs.find(j => j.id === id);
            return job && job.status === 'pending';
        });
        const canCancel = Array.from(this.selectedJobs).some(id => {
            const job = this.jobs.find(j => j.id === id);
            return job && ['submitted', 'running'].includes(job.status);
        });

        document.getElementById('submit-selected-btn').disabled = !hasSelection || !canSubmit;
        document.getElementById('cancel-selected-btn').disabled = !hasSelection || !canCancel;
        document.getElementById('delete-selected-btn').disabled = !hasSelection;
    }

    async viewJob(jobId) {
        try {
            const response = await fetch(`/api/jobs/${jobId}`);
            const job = await response.json();
            
            this.currentJob = job;
            this.showJobDetails(job);
        } catch (error) {
            console.error('Error loading job:', error);
        }
    }

    showJobDetails(job) {
        document.getElementById('job-name').textContent = job.name;
        document.getElementById('job-status').textContent = this.getStatusText(job.status);
        document.getElementById('job-status').className = `status-badge ${this.getStatusClass(job.status)}`;
        document.getElementById('job-cluster').textContent = job.cluster;
        document.getElementById('job-created').textContent = new Date(job.createdAt).toLocaleString('zh-CN');
        document.getElementById('job-slurm-id').textContent = job.slurmJobId || '-';
        document.getElementById('job-script').value = job.script;
        document.getElementById('job-logs').textContent = job.logs.join('\n') || '暂无日志';
        document.getElementById('job-output').textContent = job.output || '暂无输出';

        document.getElementById('job-details').classList.remove('hidden');
    }

    hideJobDetails() {
        document.getElementById('job-details').classList.add('hidden');
        this.currentJob = null;
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });
    }

    showNewJobModal() {
        this.populateTemplateSelect();
        this.populateClusterSelect();
        document.getElementById('new-job-modal').classList.remove('hidden');
    }

    hideNewJobModal() {
        document.getElementById('new-job-modal').classList.add('hidden');
        document.getElementById('new-job-form').reset();
    }

    populateTemplateSelect() {
        const select = document.getElementById('job-template-select');
        select.innerHTML = '<option value="">选择模板...</option>';
        
        this.templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            select.appendChild(option);
        });
    }

    populateClusterSelect() {
        const select = document.getElementById('job-cluster-select');
        select.innerHTML = '<option value="">选择集群...</option>';
        
        this.clusters.forEach(cluster => {
            const option = document.createElement('option');
            option.value = cluster.id;
            option.textContent = cluster.name;
            option.disabled = cluster.status !== 'active';
            select.appendChild(option);
        });
    }

    onTemplateSelect(event) {
        const templateId = event.target.value;
        const template = this.templates.find(t => t.id === templateId);
        
        if (template) {
            document.getElementById('job-script-input').value = template.script;
        }
    }

    async createJob(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const jobData = {
            name: formData.get('job-name-input') || document.getElementById('job-name-input').value,
            templateId: document.getElementById('job-template-select').value,
            script: document.getElementById('job-script-input').value,
            cluster: document.getElementById('job-cluster-select').value,
            options: {}
        };

        try {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData)
            });
            
            const job = await response.json();
            this.jobs.push(job);
            this.renderJobs();
            this.hideNewJobModal();
            this.showSuccess('作业创建成功');
        } catch (error) {
            this.showError('创建作业失败: ' + error.message);
        }
    }

    async submitJob(jobId) {
        try {
            const response = await fetch(`/api/jobs/${jobId}/submit`, {
                method: 'POST'
            });
            
            const job = await response.json();
            this.updateJobInList(job);
            this.renderJobs();
            this.showSuccess('作业提交成功');
        } catch (error) {
            this.showError('提交作业失败: ' + error.message);
        }
    }

    async cancelJob(jobId) {
        try {
            const response = await fetch(`/api/jobs/${jobId}/cancel`, {
                method: 'POST'
            });
            
            const job = await response.json();
            this.updateJobInList(job);
            this.renderJobs();
            this.showSuccess('作业已取消');
        } catch (error) {
            this.showError('取消作业失败: ' + error.message);
        }
    }

    async deleteJob(jobId) {
        if (!confirm('确定要删除这个作业吗？')) return;
        
        try {
            const response = await fetch(`/api/jobs/${jobId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.jobs = this.jobs.filter(j => j.id !== jobId);
                this.selectedJobs.delete(jobId);
                this.renderJobs();
                this.hideJobDetails();
                this.showSuccess('作业已删除');
            }
        } catch (error) {
            this.showError('删除作业失败: ' + error.message);
        }
    }

    async submitSelectedJobs() {
        const pendingJobs = Array.from(this.selectedJobs).filter(id => {
            const job = this.jobs.find(j => j.id === id);
            return job && job.status === 'pending';
        });

        for (const jobId of pendingJobs) {
            await this.submitJob(jobId);
        }
    }

    async cancelSelectedJobs() {
        const activeJobs = Array.from(this.selectedJobs).filter(id => {
            const job = this.jobs.find(j => j.id === id);
            return job && ['submitted', 'running'].includes(job.status);
        });

        for (const jobId of activeJobs) {
            await this.cancelJob(jobId);
        }
    }

    async deleteSelectedJobs() {
        if (!confirm(`确定要删除选中的 ${this.selectedJobs.size} 个作业吗？`)) return;
        
        const deletePromises = Array.from(this.selectedJobs).map(id => this.deleteJob(id));
        await Promise.all(deletePromises);
    }

    updateJobInList(updatedJob) {
        const index = this.jobs.findIndex(j => j.id === updatedJob.id);
        if (index !== -1) {
            this.jobs[index] = updatedJob;
        }
    }

    renderTemplates() {
        const templatesList = document.getElementById('templates-list');
        templatesList.innerHTML = '';

        this.templates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.innerHTML = `
                <div class="template-name">${template.name}</div>
                <div class="template-description">${template.description}</div>
                <div class="template-category">${template.category || 'Custom'}</div>
            `;
            item.addEventListener('click', () => this.useTemplate(template));
            templatesList.appendChild(item);
        });
    }

    useTemplate(template) {
        document.getElementById('job-template-select').value = template.id;
        document.getElementById('job-script-input').value = template.script;
    }

    // Template Management Methods
    showNewTemplateModal() {
        document.getElementById('template-form-title').textContent = '新建模板';
        document.getElementById('template-form').reset();
        document.getElementById('template-id-input').value = '';
        document.getElementById('template-management-modal').classList.add('hidden');
        document.getElementById('template-form-modal').classList.remove('hidden');
    }

    showTemplateManagementModal() {
        this.renderTemplateManagement();
        document.getElementById('template-management-modal').classList.remove('hidden');
    }

    hideTemplateManagementModal() {
        document.getElementById('template-management-modal').classList.add('hidden');
    }

    showNewTemplateModal() {
        document.getElementById('template-form-title').textContent = '新建模板';
        document.getElementById('template-form').reset();
        document.getElementById('template-id-input').value = '';
        document.getElementById('template-management-modal').classList.add('hidden');
        document.getElementById('template-form-modal').classList.remove('hidden');
    }

    hideTemplateFormModal() {
        document.getElementById('template-form-modal').classList.add('hidden');
    }

    async renderTemplateManagement() {
        const list = document.getElementById('template-management-list');
        list.innerHTML = '';

        this.templates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'template-management-item';
            
            const createdDate = new Date(template.createdAt || Date.now()).toLocaleString('zh-CN');
            const updatedDate = new Date(template.updatedAt || template.createdAt || Date.now()).toLocaleString('zh-CN');
            
            item.innerHTML = `
                <div class="template-management-header">
                    <div class="template-management-info">
                        <h4>${template.name}</h4>
                        <div class="template-management-meta">
                            <span><i class="fas fa-tag"></i> ${template.category || 'Custom'}</span>
                            <span><i class="fas fa-calendar-plus"></i> ${createdDate}</span>
                            <span><i class="fas fa-calendar-edit"></i> ${updatedDate}</span>
                        </div>
                    </div>
                    <div class="template-management-actions">
                        <button class="btn btn-sm btn-primary" onclick="jobManager.editTemplate('${template.id}')">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="jobManager.deleteTemplate('${template.id}')">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
                <div class="template-management-description">${template.description || '暂无描述'}</div>
                <div class="template-management-script collapsed" id="script-${template.id}">
                    ${template.script}
                </div>
                <button class="template-script-toggle" onclick="jobManager.toggleScript('${template.id}')">
                    展开脚本
                </button>
            `;
            
            list.appendChild(item);
        });
    }

    toggleScript(templateId) {
        const scriptElement = document.getElementById(`script-${templateId}`);
        const toggleButton = scriptElement.nextElementSibling;
        
        if (scriptElement.classList.contains('collapsed')) {
            scriptElement.classList.remove('collapsed');
            toggleButton.textContent = '收起脚本';
        } else {
            scriptElement.classList.add('collapsed');
            toggleButton.textContent = '展开脚本';
        }
    }

    async editTemplate(templateId) {
        try {
            const response = await fetch(`/api/templates/${templateId}`);
            const template = await response.json();
            
            document.getElementById('template-form-title').textContent = '编辑模板';
            document.getElementById('template-id-input').value = template.id;
            document.getElementById('template-name-input').value = template.name;
            document.getElementById('template-description-input').value = template.description || '';
            document.getElementById('template-category-input').value = template.category || 'Custom';
            document.getElementById('template-script-input').value = template.script;
            
            document.getElementById('template-management-modal').classList.add('hidden');
            document.getElementById('template-form-modal').classList.remove('hidden');
        } catch (error) {
            this.showError('加载模板失败: ' + error.message);
        }
    }

    async deleteTemplate(templateId) {
        if (!confirm('确定要删除这个模板吗？')) return;
        
        try {
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.templates = this.templates.filter(t => t.id !== templateId);
                this.renderTemplates();
                this.renderTemplateManagement();
                this.showSuccess('模板已删除');
            } else {
                const error = await response.json();
                this.showError('删除模板失败: ' + error.error);
            }
        } catch (error) {
            this.showError('删除模板失败: ' + error.message);
        }
    }

    async saveTemplate(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const templateData = {
            name: document.getElementById('template-name-input').value,
            description: document.getElementById('template-description-input').value,
            script: document.getElementById('template-script-input').value,
            category: document.getElementById('template-category-input').value
        };
        
        const templateId = document.getElementById('template-id-input').value;
        const isEdit = templateId !== '';
        
        try {
            let response;
            if (isEdit) {
                response = await fetch(`/api/templates/${templateId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(templateData)
                });
            } else {
                response = await fetch('/api/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(templateData)
                });
            }
            
            const template = await response.json();
            
            if (isEdit) {
                const index = this.templates.findIndex(t => t.id === templateId);
                if (index !== -1) {
                    this.templates[index] = template;
                }
            } else {
                this.templates.push(template);
            }
            
            this.renderTemplates();
            this.renderTemplateManagement();
            this.hideTemplateFormModal();
            this.showSuccess(isEdit ? '模板已更新' : '模板已创建');
        } catch (error) {
            this.showError('保存模板失败: ' + error.message);
        }
    }

    filterTemplates(searchTerm) {
        const items = document.querySelectorAll('.template-management-item');
        items.forEach(item => {
            const name = item.querySelector('h4').textContent.toLowerCase();
            const description = item.querySelector('.template-management-description').textContent.toLowerCase();
            const matches = name.includes(searchTerm.toLowerCase()) || description.includes(searchTerm.toLowerCase());
            item.style.display = matches ? 'block' : 'none';
        });
    }

    async refresh() {
        await this.loadJobs();
        this.renderJobs();
        this.showSuccess('数据已刷新');
    }

    showSuccess(message) {
        // TODO: Implement proper notification system
        console.log('Success:', message);
    }

    showError(message) {
        // TODO: Implement proper error notification system
        console.error('Error:', message);
        alert(message);
    }
}

// Make jobManager globally available for inline event handlers
let jobManager;

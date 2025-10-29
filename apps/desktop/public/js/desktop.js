// Desktop Application JavaScript

const API_BASE = '';
let sessions = [];
let desktopEnvironments = {};
let refreshInterval = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadDesktopEnvironments();
  loadSessions();
  setupEventListeners();
  
  // Auto-refresh sessions every 5 seconds
  refreshInterval = setInterval(loadSessions, 5000);
});

// Setup event listeners
function setupEventListeners() {
  const form = document.getElementById('sessionForm');
  form.addEventListener('submit', handleSessionCreate);
  
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.addEventListener('click', () => {
    loadSessions();
    showToast('会话列表已刷新', 'success');
  });
}

// Load available desktop environments
async function loadDesktopEnvironments() {
  try {
    const response = await fetch(`${API_BASE}/api/desktops`);
    if (!response.ok) throw new Error('Failed to load desktops');
    
    desktopEnvironments = await response.json();
    populateDesktopSelect();
  } catch (error) {
    console.error('Error loading desktops:', error);
    showToast('加载桌面环境失败', 'error');
  }
}

// Populate desktop select dropdown
function populateDesktopSelect() {
  const select = document.getElementById('desktop');
  select.innerHTML = '<option value="">-- 选择桌面环境 --</option>';
  
  Object.entries(desktopEnvironments).forEach(([key, desktop]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${desktop.name} - ${desktop.description}`;
    select.appendChild(option);
  });
}

// Load sessions
async function loadSessions() {
  try {
    const response = await fetch(`${API_BASE}/api/sessions`);
    if (!response.ok) throw new Error('Failed to load sessions');
    
    sessions = await response.json();
    renderSessions();
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// Render sessions list
function renderSessions() {
  const container = document.getElementById('sessionsList');
  
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>暂无活动会话</p>
        <small>创建新会话开始使用交互式桌面</small>
      </div>
    `;
    return;
  }
  
  container.innerHTML = sessions.map(session => createSessionCard(session)).join('');
  
  // Attach event listeners to buttons
  sessions.forEach(session => {
    const cancelBtn = document.getElementById(`cancel-${session.id}`);
    const deleteBtn = document.getElementById(`delete-${session.id}`);
    const connectBtn = document.getElementById(`connect-${session.id}`);
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => handleSessionCancel(session.id));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => handleSessionDelete(session.id));
    }
    if (connectBtn) {
      connectBtn.addEventListener('click', () => handleSessionConnect(session.id));
    }
  });
}

// Create session card HTML
function createSessionCard(session) {
  const statusClass = `status-${session.status}`;
  const statusText = getStatusText(session.status);
  const createdTime = new Date(session.createdAt).toLocaleString('zh-CN');
  
  let actionsHtml = '';
  let connectionHtml = '';
  
  if (session.status === 'running') {
    actionsHtml = `
      <button id="connect-${session.id}" class="btn btn-primary btn-sm">
        <i class="fas fa-plug"></i> 连接桌面
      </button>
      <button id="cancel-${session.id}" class="btn btn-danger btn-sm">
        <i class="fas fa-stop"></i> 停止
      </button>
    `;
    
    connectionHtml = `
      <div class="connection-info">
        <h4><i class="fas fa-info-circle"></i> 连接信息</h4>
        <p><strong>主机:</strong> <code>${session.host}</code></p>
        <p><strong>端口:</strong> <code>${session.websocketPort}</code></p>
        <p><strong>密码:</strong> <code>${session.password}</code></p>
        <p><strong>显示:</strong> <code>${session.vncDisplay}</code></p>
      </div>
    `;
  } else if (session.status === 'starting') {
    actionsHtml = `
      <button class="btn btn-warning btn-sm" disabled>
        <span class="spinner"></span> 启动中...
      </button>
      <button id="cancel-${session.id}" class="btn btn-danger btn-sm">
        <i class="fas fa-times"></i> 取消
      </button>
    `;
  } else if (session.status === 'completed' || session.status === 'cancelled' || session.status === 'failed') {
    actionsHtml = `
      <button id="delete-${session.id}" class="btn btn-danger btn-sm">
        <i class="fas fa-trash"></i> 删除
      </button>
    `;
  }
  
  return `
    <div class="session-card">
      <div class="session-header">
        <div class="session-title">
          <i class="fas fa-desktop"></i>
          <h3>${session.desktopName}</h3>
        </div>
        <span class="session-status ${statusClass}">${statusText}</span>
      </div>
      
      <div class="session-info">
        <div class="info-item">
          <i class="fas fa-tv"></i>
          <span><strong>分辨率:</strong> ${session.resolution}</span>
        </div>
        <div class="info-item">
          <i class="fas fa-clock"></i>
          <span><strong>时长:</strong> ${session.duration} 小时</span>
        </div>
        <div class="info-item">
          <i class="fas fa-microchip"></i>
          <span><strong>CPU:</strong> ${session.cores} 核</span>
        </div>
        <div class="info-item">
          <i class="fas fa-memory"></i>
          <span><strong>内存:</strong> ${session.memory} GB</span>
        </div>
        <div class="info-item">
          <i class="fas fa-calendar"></i>
          <span><strong>创建时间:</strong> ${createdTime}</span>
        </div>
        ${session.startedAt ? `
        <div class="info-item">
          <i class="fas fa-play-circle"></i>
          <span><strong>启动时间:</strong> ${new Date(session.startedAt).toLocaleString('zh-CN')}</span>
        </div>
        ` : ''}
      </div>
      
      ${connectionHtml}
      
      <div class="session-actions">
        ${actionsHtml}
      </div>
    </div>
  `;
}

// Get status text in Chinese
function getStatusText(status) {
  const statusMap = {
    'starting': '启动中',
    'running': '运行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'failed': '失败'
  };
  return statusMap[status] || status;
}

// Handle session creation
async function handleSessionCreate(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    desktop: formData.get('desktop'),
    resolution: formData.get('resolution'),
    duration: parseInt(formData.get('duration')),
    cores: parseInt(formData.get('cores')),
    memory: parseInt(formData.get('memory'))
  };
  
  try {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create session');
    }
    
    const session = await response.json();
    showToast('桌面会话创建成功！正在启动...', 'success');
    
    // Reset form
    e.target.reset();
    
    // Reload sessions
    await loadSessions();
  } catch (error) {
    console.error('Error creating session:', error);
    showToast(`创建会话失败: ${error.message}`, 'error');
  }
}

// Handle session cancel
async function handleSessionCancel(sessionId) {
  if (!confirm('确定要停止这个会话吗？')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/cancel`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to cancel session');
    
    showToast('会话已停止', 'success');
    await loadSessions();
  } catch (error) {
    console.error('Error cancelling session:', error);
    showToast('停止会话失败', 'error');
  }
}

// Handle session delete
async function handleSessionDelete(sessionId) {
  if (!confirm('确定要删除这个会话吗？')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete session');
    
    showToast('会话已删除', 'success');
    await loadSessions();
  } catch (error) {
    console.error('Error deleting session:', error);
    showToast('删除会话失败', 'error');
  }
}

// Handle session connect
async function handleSessionConnect(sessionId) {
  try {
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error('会话不存在');
    }
    
    // Check if using real VNC
    if (!session.realVNC) {
      showToast('此会话使用模拟 VNC。要使用真实 VNC，请设置环境变量 USE_REAL_VNC=true 重启服务器。', 'warning');
      
      // Show connection info instead
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/vnc`);
      if (response.ok) {
        const connection = await response.json();
        alert(`VNC 连接信息:\n\n主机: ${connection.host}\n端口: ${connection.port}\n密码: ${connection.password}\n\n这是模拟模式。启用真实 VNC 后可直接连接。`);
      }
      return;
    }
    
    // Open noVNC viewer in new window
    const vncWindow = window.open(
      `/vnc.html?session=${sessionId}`,
      '_blank',
      'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no'
    );
    
    if (!vncWindow) {
      throw new Error('无法打开新窗口。请允许弹出窗口。');
    }
    
    showToast('正在打开 VNC 连接...', 'success');
    
  } catch (error) {
    console.error('Error connecting to session:', error);
    showToast(`连接失败: ${error.message}`, 'error');
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});


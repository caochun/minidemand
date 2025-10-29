const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const vncManager = require('./vnc-manager');

const app = express();
const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || 'localhost';
const USE_REAL_VNC = process.env.USE_REAL_VNC === 'true' || false;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory session storage (in production, use a database)
let sessions = [];

// Desktop environment configurations
const desktopEnvironments = {
  mate: {
    name: 'MATE Desktop',
    description: 'A lightweight desktop environment',
    icon: 'desktop',
    script: 'mate.sh'
  },
  xfce: {
    name: 'Xfce Desktop',
    description: 'A fast and lightweight desktop environment',
    icon: 'desktop',
    script: 'xfce.sh'
  },
  gnome: {
    name: 'GNOME Desktop',
    description: 'A modern desktop environment',
    icon: 'desktop',
    script: 'gnome.sh'
  },
  kde: {
    name: 'KDE Plasma',
    description: 'A feature-rich desktop environment',
    icon: 'desktop',
    script: 'kde.sh'
  }
};

// Initialize templates directory
const initializeTemplates = async () => {
  const templatesDir = path.join(__dirname, '../templates');
  const desktopsDir = path.join(templatesDir, 'desktops');
  
  console.log('Initializing templates in:', templatesDir);
  
  try {
    await fs.mkdir(desktopsDir, { recursive: true });
    console.log('Templates directory created');
  } catch (error) {
    console.error('Error creating templates directory:', error);
  }
};

// Generate random VNC password
const generatePassword = () => {
  return Math.random().toString(36).substring(2, 10);
};

// Generate random port number
const generatePort = () => {
  return Math.floor(5900 + Math.random() * 100);
};

// Start VNC server (real or simulated)
const startVNCServer = async (session) => {
  try {
    console.log(`Starting VNC server for session ${session.id} (Real VNC: ${USE_REAL_VNC})`);
    
    if (USE_REAL_VNC) {
      // Use real VNC implementation
      const vncInfo = await vncManager.startSession(session);
      
      session.status = 'running';
      session.startedAt = new Date().toISOString();
      session.host = os.hostname();
      session.vncDisplay = vncInfo.display;
      session.vncPort = vncInfo.vncPort;
      session.websocketPort = vncInfo.websocketPort;
      session.realVNC = true;
    } else {
      // Simulate VNC server startup (for development/testing)
      session.status = 'running';
      session.startedAt = new Date().toISOString();
      session.host = os.hostname();
      session.vncDisplay = ':1';
      session.websocketPort = session.port;
      session.realVNC = false;
    }
    
    return session;
  } catch (error) {
    console.error(`Failed to start VNC for session ${session.id}:`, error);
    throw error;
  }
};

// Stop VNC server
const stopVNCServer = async (session) => {
  try {
    console.log(`Stopping VNC server for session ${session.id}`);
    
    if (USE_REAL_VNC && session.realVNC) {
      await vncManager.stopSession(session.id);
    }
    
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    
    return session;
  } catch (error) {
    console.error('Error stopping VNC server:', error);
    return session;
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    title: 'MiniDemand Interactive Desktop',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Get available desktop environments
app.get('/api/desktops', (req, res) => {
  res.json(desktopEnvironments);
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  res.json(sessions);
});

// Create new session
app.post('/api/sessions', async (req, res) => {
  try {
    const { 
      desktop, 
      resolution = '1920x1080',
      duration = 2,
      cores = 1,
      memory = 2
    } = req.body;
    
    if (!desktop || !desktopEnvironments[desktop]) {
      return res.status(400).json({ 
        error: 'Invalid desktop environment',
        available: Object.keys(desktopEnvironments)
      });
    }
    
    const sessionId = uuidv4();
    const password = generatePassword();
    const port = generatePort();
    
    const session = {
      id: sessionId,
      desktop: desktop,
      desktopName: desktopEnvironments[desktop].name,
      resolution: resolution,
      duration: duration,
      cores: cores,
      memory: memory,
      status: 'starting',
      password: password,
      port: port,
      createdAt: new Date().toISOString(),
      host: null,
      vncDisplay: null,
      websocketPort: null,
      startedAt: null,
      completedAt: null,
      logs: []
    };
    
    sessions.push(session);
    
    // Start VNC server asynchronously
    setTimeout(async () => {
      try {
        await startVNCServer(session);
        console.log(`Session ${sessionId} is now running`);
      } catch (error) {
        console.error(`Failed to start session ${sessionId}:`, error);
        session.status = 'failed';
        session.error = error.message;
      }
    }, 3000); // Simulate startup delay
    
    res.json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session details
app.get('/api/sessions/:id', (req, res) => {
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// Cancel/stop session
app.post('/api/sessions/:id/cancel', async (req, res) => {
  try {
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.status === 'running') {
      await stopVNCServer(session);
    } else {
      session.status = 'cancelled';
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete session
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessions[sessionIndex];
    
    // Stop VNC server if running
    if (session.status === 'running') {
      await stopVNCServer(session);
    }
    
    sessions.splice(sessionIndex, 1);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session logs
app.get('/api/sessions/:id/logs', (req, res) => {
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    logs: session.logs || [],
    status: session.status,
    error: session.error || null
  });
});

// VNC connection info (for future noVNC integration)
app.get('/api/sessions/:id/vnc', (req, res) => {
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (session.status !== 'running') {
    return res.status(400).json({ 
      error: 'Session is not running',
      status: session.status
    });
  }
  
  res.json({
    host: session.host,
    port: session.websocketPort,
    password: session.password,
    path: `vnc/${session.id}`,
    autoconnect: true
  });
});

// Start server
async function startServer() {
  try {
    await initializeTemplates();
    console.log('Templates initialization completed');
    
    app.listen(PORT, HOST, () => {
      console.log(`MiniDemand Interactive Desktop Server running on http://${HOST}:${PORT}`);
      console.log(`Templates directory: ${path.join(__dirname, '../templates')}`);
      console.log(`Available desktops:`, Object.keys(desktopEnvironments).join(', '));
    });
  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Stop all running sessions
  sessions.forEach(session => {
    if (session.status === 'running') {
      stopVNCServer(session);
    }
  });
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  
  // Stop all running sessions
  sessions.forEach(session => {
    if (session.status === 'running') {
      stopVNCServer(session);
    }
  });
  
  process.exit(0);
});


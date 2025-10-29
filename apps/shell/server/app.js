const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';  // Listen on all interfaces (IPv4 + IPv6)
const TERM_NAME = process.env.TERM_NAME || 'xterm-16color';
const INACTIVE_TIMEOUT = parseInt(process.env.INACTIVE_TIMEOUT_MS) || 300000;
const MAX_DURATION = parseInt(process.env.MAX_DURATION_MS) || 3600000;
const PING_PONG_ENABLED = process.env.PING_PONG_ENABLED === 'true';
const SSH_WRAPPER = process.env.SSH_WRAPPER || '/usr/bin/ssh';
const SSH_HOST = process.env.SSH_HOST || 'localhost';
const SSH_USER = process.env.SSH_USER || os.userInfo().username;
const SITE_TITLE = process.env.SITE_TITLE || 'MiniDemand Web 终端';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
    }
  }
}));
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    title: SITE_TITLE,
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established from:', req.socket.remoteAddress);
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  
  let term;
  let isAlive = true;
  let startedAt = Date.now();
  let lastActivity = Date.now();
  
  // Set properties on WebSocket object for cleanup
  ws.startedAt = startedAt;
  ws.lastActivity = lastActivity;
  ws.isAlive = true;
  
  // Create terminal
  try {
    const args = SSH_HOST === 'localhost' ? [] : [SSH_HOST];
    const cmd = SSH_HOST === 'localhost' ? process.env.SHELL || '/bin/bash' : SSH_WRAPPER;
    
    term = pty.spawn(cmd, args, {
      name: TERM_NAME,
      cols: 80,
      rows: 30,
      cwd: process.env.HOME || os.homedir(),
      env: {
        ...process.env,
        LANG: 'en_US.UTF-8'
      }
    });
    
    console.log(`Terminal created with PID: ${term.pid}`);
    
    // Terminal data handler
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
        ws.lastActivity = Date.now();
      }
    });
    
    // Terminal exit handler
    term.onExit((code, signal) => {
      console.log(`Terminal exited with code: ${code}, signal: ${signal}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'exit', code, signal }));
        ws.close();
      }
    });
    
  } catch (error) {
    console.error('Failed to create terminal:', error);
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to create terminal' }));
    ws.close();
    return;
  }
  
  // WebSocket message handler
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.input) {
        if (term) {
          term.write(data.input);
          ws.lastActivity = Date.now();
        }
      } else if (data.resize) {
        if (term && data.resize.cols && data.resize.rows) {
          term.resize(parseInt(data.resize.cols), parseInt(data.resize.rows));
        }
      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      } else {
        console.log('Unknown message type:', data.type || 'no type');
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // WebSocket close handler
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    isAlive = false;
    if (term) {
      term.kill();
    }
  });
  
  // WebSocket pong handler
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Send initial welcome message
  ws.send(`Welcome to ${SITE_TITLE}!\r\nConnected to: ${SSH_HOST}\r\n\r\n`);
});

// Cleanup inactive connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    const timeUsed = Date.now() - ws.startedAt;
    const inactiveFor = Date.now() - ws.lastActivity;
    
    if (!ws.isAlive || inactiveFor > INACTIVE_TIMEOUT || timeUsed > MAX_DURATION) {
      console.log('Terminating inactive connection - timeUsed:', timeUsed, 'inactiveFor:', inactiveFor);
      ws.terminate();
    }
    
    if (PING_PONG_ENABLED && ws.isAlive) {
      ws.isAlive = false;
      ws.ping();
    }
  });
}, 30000);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`MiniDemand Terminal Server running on http://${HOST}:${PORT}`);
  console.log(`SSH Host: ${SSH_HOST}`);
  console.log(`SSH User: ${SSH_USER}`);
  console.log(`Terminal: ${TERM_NAME}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

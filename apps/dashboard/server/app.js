const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';  // Listen on all interfaces (IPv4 + IPv6)

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
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

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    title: 'MiniDemand 仪表板',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

app.get('/api/apps', async (req, res) => {
  try {
    // __dirname => minidemand/apps/dashboard/server
    // apps root => minidemand/apps
    const appsDir = path.join(__dirname, '..', '..');
    console.log('[Dashboard] Scanning appsDir:', appsDir);
    const apps = await fs.readdir(appsDir, { withFileTypes: true });
    
    const appList = [];
    for (const app of apps) {
      if (app.isDirectory()) {
        const manifestPath = path.join(appsDir, app.name, 'manifest.yml');
        try {
          const manifestContent = await fs.readFile(manifestPath, 'utf8');
          const manifest = parseYaml(manifestContent);
          const appId = manifest.id || app.name;
          
          // Skip dashboard app itself
          if (appId === 'dashboard') {
            continue;
          }
          
          appList.push({
            ...manifest,
            id: appId,
            port: getAppPort(appId)
          });
        } catch (error) {
          console.warn(`Could not read manifest for ${app.name}:`, error.message);
        }
      }
    }
    
    res.json(appList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple YAML parser for manifest files
function parseYaml(content) {
  const lines = content.split('\n');
  const result = {};
  let currentKey = null;
  let currentValue = '';
  
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    
    if (line.includes(':')) {
      if (currentKey) {
        result[currentKey] = currentValue.trim();
        currentValue = '';
      }
      const [key, ...valueParts] = line.split(':');
      currentKey = key.trim();
      const value = valueParts.join(':').trim();
      if (value && value !== '|-') {
        result[currentKey] = value;
        currentKey = null;
      }
    } else if (currentKey && line.startsWith('  ')) {
      currentValue += line.substring(2) + '\n';
    }
  }
  
  if (currentKey) {
    result[currentKey] = currentValue.trim();
  }
  
  return result;
}

function getAppPort(appName) {
  const portMap = {
    'shell': 3000,
    'files': 3001,
    'dashboard': 3002,
    'jobs': 3003
  };
  return portMap[appName] || 3000;
}

// Start server
app.listen(PORT, HOST, () => {
  console.log(`MiniDemand Dashboard Server running on http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

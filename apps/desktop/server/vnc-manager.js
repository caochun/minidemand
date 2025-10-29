/**
 * VNC Manager Module
 * 
 * Handles VNC server and websockify process management
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const execAsync = promisify(exec);

class VNCManager {
  constructor() {
    this.processes = new Map(); // sessionId -> { vncserver, websockify, display }
  }

  /**
   * Check if command exists in PATH
   */
  async commandExists(command) {
    try {
      await execAsync(`which ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find available VNC display number
   */
  async findAvailableDisplay() {
    const displays = [];
    try {
      const files = await fs.readdir('/tmp');
      for (const file of files) {
        if (file.startsWith('.X11-unix/X')) {
          const displayNum = parseInt(file.replace('.X11-unix/X', ''));
          if (!isNaN(displayNum)) {
            displays.push(displayNum);
          }
        }
      }
    } catch (err) {
      console.log('No existing displays found');
    }

    // Find first available display (start from 1)
    let display = 1;
    while (displays.includes(display)) {
      display++;
    }
    return display;
  }

  /**
   * Create VNC password file
   */
  async createPasswordFile(sessionId, password) {
    const passwordFile = path.join('/tmp', `vnc-${sessionId}.passwd`);
    
    try {
      // Use vncpasswd to create password file
      await execAsync(`vncpasswd -f <<< "${password}${password}" > ${passwordFile}`);
      await execAsync(`chmod 600 ${passwordFile}`);
      return passwordFile;
    } catch (err) {
      console.error('Error creating password file:', err.message);
      // Fallback: create a simple password file (not as secure)
      await fs.writeFile(passwordFile, password);
      await fs.chmod(passwordFile, 0o600);
      return passwordFile;
    }
  }

  /**
   * Start VNC server
   */
  async startVNCServer(session) {
    const display = await this.findAvailableDisplay();
    const displayStr = `:${display}`;
    const vncPort = 5900 + display;
    const passwordFile = await this.createPasswordFile(session.id, session.password);
    
    // Determine VNC server command
    let vncCommand = 'vncserver';
    if (await this.commandExists('vncserver')) {
      vncCommand = 'vncserver';
    } else if (await this.commandExists('Xvnc')) {
      vncCommand = 'Xvnc';
    } else if (await this.commandExists('x11vnc')) {
      vncCommand = 'x11vnc';
    } else {
      throw new Error('No VNC server found. Please install vncserver, Xvnc, or x11vnc');
    }

    console.log(`Starting VNC server: ${vncCommand} ${displayStr}`);

    // Get desktop startup script
    const desktopScript = path.join(
      __dirname,
      '..',
      'templates',
      'desktops',
      `${session.desktop}.sh`
    );

    // Create xstartup script
    const xstartupFile = path.join('/tmp', `xstartup-${session.id}.sh`);
    await fs.writeFile(xstartupFile, `#!/bin/bash\nsource "${desktopScript}"\n`);
    await fs.chmod(xstartupFile, 0o755);

    return new Promise((resolve, reject) => {
      let vncserver;

      if (vncCommand === 'vncserver') {
        // TigerVNC or TurboVNC
        vncserver = spawn('vncserver', [
          displayStr,
          '-geometry', session.resolution,
          '-depth', '24',
          '-localhost', 'no',
          '-SecurityTypes', 'VncAuth',
          '-PasswordFile', passwordFile,
          '-xstartup', xstartupFile
        ]);
      } else if (vncCommand === 'Xvnc') {
        // Direct Xvnc
        vncserver = spawn('Xvnc', [
          displayStr,
          '-geometry', session.resolution,
          '-depth', '24',
          '-SecurityTypes', 'VncAuth',
          '-PasswordFile', passwordFile
        ]);
      } else {
        // x11vnc
        vncserver = spawn('x11vnc', [
          '-display', displayStr,
          '-geometry', session.resolution,
          '-usepw',
          '-passwdfile', passwordFile,
          '-forever'
        ]);
      }

      vncserver.stdout.on('data', (data) => {
        console.log(`VNC stdout: ${data}`);
      });

      vncserver.stderr.on('data', (data) => {
        console.log(`VNC stderr: ${data}`);
      });

      vncserver.on('error', (err) => {
        console.error('VNC server error:', err);
        reject(err);
      });

      // Give VNC server time to start
      setTimeout(() => {
        if (vncserver.killed) {
          reject(new Error('VNC server failed to start'));
        } else {
          resolve({
            process: vncserver,
            display: displayStr,
            port: vncPort,
            passwordFile,
            xstartupFile
          });
        }
      }, 2000);
    });
  }

  /**
   * Start websockify proxy
   */
  async startWebsockify(session, vncPort) {
    return new Promise(async (resolve, reject) => {
      // Check if websockify is available
      const hasWebsockify = await this.commandExists('websockify');
      
      if (!hasWebsockify) {
        console.warn('Websockify not found. Please install: pip install websockify');
        // Return dummy process for development
        resolve({
          process: null,
          port: session.port
        });
        return;
      }

      const noVNCPath = path.join(__dirname, '..', 'public', 'noVNC');
      
      const websockify = spawn('websockify', [
        '--web', noVNCPath,
        session.port.toString(),
        `localhost:${vncPort}`
      ]);

      websockify.stdout.on('data', (data) => {
        console.log(`Websockify stdout: ${data}`);
      });

      websockify.stderr.on('data', (data) => {
        console.log(`Websockify stderr: ${data}`);
      });

      websockify.on('error', (err) => {
        console.error('Websockify error:', err);
        reject(err);
      });

      // Give websockify time to start
      setTimeout(() => {
        if (websockify.killed) {
          reject(new Error('Websockify failed to start'));
        } else {
          resolve({
            process: websockify,
            port: session.port
          });
        }
      }, 1000);
    });
  }

  /**
   * Start complete VNC session
   */
  async startSession(session) {
    try {
      console.log(`Starting VNC session ${session.id}...`);

      // Start VNC server
      const vnc = await this.startVNCServer(session);
      console.log(`VNC server started on display ${vnc.display}`);

      // Start websockify
      const ws = await this.startWebsockify(session, vnc.port);
      console.log(`Websockify started on port ${ws.port}`);

      // Store processes
      this.processes.set(session.id, {
        vncserver: vnc.process,
        websockify: ws.process,
        display: vnc.display,
        vncPort: vnc.port,
        websocketPort: ws.port,
        passwordFile: vnc.passwordFile,
        xstartupFile: vnc.xstartupFile
      });

      return {
        display: vnc.display,
        vncPort: vnc.port,
        websocketPort: ws.port
      };
    } catch (err) {
      console.error('Failed to start VNC session:', err);
      throw err;
    }
  }

  /**
   * Stop VNC session
   */
  async stopSession(sessionId) {
    const processes = this.processes.get(sessionId);
    if (!processes) {
      console.log(`No processes found for session ${sessionId}`);
      return;
    }

    try {
      // Stop websockify
      if (processes.websockify) {
        processes.websockify.kill('SIGTERM');
        console.log(`Stopped websockify for session ${sessionId}`);
      }

      // Stop VNC server
      if (processes.vncserver) {
        processes.vncserver.kill('SIGTERM');
        // Also try vncserver -kill command
        try {
          await execAsync(`vncserver -kill ${processes.display}`);
        } catch (err) {
          console.log('vncserver -kill failed, process may already be stopped');
        }
        console.log(`Stopped VNC server for session ${sessionId}`);
      }

      // Clean up files
      try {
        if (processes.passwordFile) {
          await fs.unlink(processes.passwordFile);
        }
        if (processes.xstartupFile) {
          await fs.unlink(processes.xstartupFile);
        }
      } catch (err) {
        console.log('Error cleaning up files:', err.message);
      }

      this.processes.delete(sessionId);
    } catch (err) {
      console.error(`Error stopping session ${sessionId}:`, err);
    }
  }

  /**
   * Check if session is running
   */
  isSessionRunning(sessionId) {
    return this.processes.has(sessionId);
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId) {
    return this.processes.get(sessionId);
  }

  /**
   * Stop all sessions
   */
  async stopAllSessions() {
    const sessionIds = Array.from(this.processes.keys());
    for (const sessionId of sessionIds) {
      await this.stopSession(sessionId);
    }
  }
}

module.exports = new VNCManager();


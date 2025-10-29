#!/usr/bin/env node
/**
 * Install noVNC client
 * 
 * This script downloads noVNC from GitHub and extracts it to the public directory
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NOVNC_VERSION = '1.4.0';
const NOVNC_URL = `https://github.com/novnc/noVNC/archive/refs/tags/v${NOVNC_VERSION}.tar.gz`;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const NOVNC_DIR = path.join(PUBLIC_DIR, 'noVNC');
const TEMP_FILE = path.join(PUBLIC_DIR, 'novnc.tar.gz');

console.log('🚀 Installing noVNC...');
console.log(`Version: ${NOVNC_VERSION}`);
console.log(`Target directory: ${NOVNC_DIR}`);

// Check if noVNC already exists
if (fs.existsSync(NOVNC_DIR)) {
  console.log('✓ noVNC already installed');
  process.exit(0);
}

// Create public directory if it doesn't exist
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

console.log('\n📥 Downloading noVNC...');
console.log(`URL: ${NOVNC_URL}`);

// Download noVNC
const file = fs.createWriteStream(TEMP_FILE);
https.get(NOVNC_URL, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    https.get(response.headers.location, (redirectResponse) => {
      redirectResponse.pipe(file);
      file.on('finish', () => {
        file.close();
        extractNoVNC();
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      extractNoVNC();
    });
  }
}).on('error', (err) => {
  fs.unlink(TEMP_FILE, () => {});
  console.error('❌ Download failed:', err.message);
  process.exit(1);
});

function extractNoVNC() {
  try {
    console.log('\n📦 Extracting noVNC...');
    
    // Extract tar.gz
    execSync(`tar -xzf ${TEMP_FILE} -C ${PUBLIC_DIR}`, { stdio: 'inherit' });
    
    // Rename directory
    const extractedDir = path.join(PUBLIC_DIR, `noVNC-${NOVNC_VERSION}`);
    fs.renameSync(extractedDir, NOVNC_DIR);
    
    // Clean up
    fs.unlinkSync(TEMP_FILE);
    
    console.log('\n✓ noVNC installed successfully!');
    console.log(`Location: ${NOVNC_DIR}`);
    console.log('\n💡 You can now start the desktop application');
    
  } catch (err) {
    console.error('❌ Extraction failed:', err.message);
    process.exit(1);
  }
}


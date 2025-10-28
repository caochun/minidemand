/**
 * MiniDemand Terminal - Based on Open OnDemand Shell App
 */

class MiniDemandTerminal {
    constructor() {
        this.element = document.getElementById('terminal');
        this.socket = null;
        this.term = null;
        this.isConnected = false;
        this.currentTheme = 'default';
        this.settings = {
            fontSize: 14,
            cursorBlink: true,
            bellSound: false
        };
        
        this.initElements();
        this.bindEvents();
        this.loadSettings();
        this.setupHterm();
    }
    
    initElements() {
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusInfo = document.getElementById('statusInfo');
        this.terminalInfo = document.getElementById('terminalInfo');
        this.themeSelect = document.getElementById('themeSelect');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Settings modal elements
        this.fontSizeSlider = document.getElementById('fontSize');
        this.fontSizeValue = document.getElementById('fontSizeValue');
        this.cursorBlinkCheckbox = document.getElementById('cursorBlink');
        this.bellSoundCheckbox = document.getElementById('bellSound');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        this.cancelSettingsBtn = document.getElementById('cancelSettings');
        this.modalClose = document.querySelector('.modal-close');
    }
    
    bindEvents() {
        // Terminal focus
        this.element.addEventListener('click', () => {
            if (this.term) {
                this.term.focus();
            }
        });
        
        // Theme selection
        this.themeSelect.addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });
        
        // Fullscreen toggle
        this.fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Settings modal
        this.settingsBtn.addEventListener('click', () => {
            this.showSettings();
        });
        
        this.modalClose.addEventListener('click', () => {
            this.hideSettings();
        });
        
        this.cancelSettingsBtn.addEventListener('click', () => {
            this.hideSettings();
        });
        
        this.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Font size slider
        this.fontSizeSlider.addEventListener('input', (e) => {
            this.fontSizeValue.textContent = e.target.value;
        });
        
        // Close modal on outside click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === '=') {
                e.preventDefault();
                this.increaseFontSize();
            } else if (e.ctrlKey && e.key === '-') {
                e.preventDefault();
                this.decreaseFontSize();
            } else if (e.ctrlKey && e.key === '0') {
                e.preventDefault();
                this.resetFontSize();
            }
        });
    }
    
    setupHterm() {
        // Set up hterm themes similar to Open OnDemand
        const themes = {
            'default': {
                'use-default-window-copy': true,
                'ctrl-v-paste': true,
                'ctrl-c-copy': true,
                'cursor-blink': true,
                'cursor-color': '#ffffff',
                'audible-bell-sound': '',
                'font-size': this.settings.fontSize
            },
            'dark': {
                'use-default-window-copy': true,
                'ctrl-v-paste': true,
                'ctrl-c-copy': true,
                'cursor-blink': true,
                'cursor-color': '#ffffff',
                'audible-bell-sound': '',
                'background-color': '#1e1e1e',
                'foreground-color': '#ffffff',
                'font-size': this.settings.fontSize
            },
            'light': {
                'use-default-window-copy': true,
                'ctrl-v-paste': true,
                'ctrl-c-copy': true,
                'cursor-blink': true,
                'cursor-color': '#000000',
                'audible-bell-sound': '',
                'background-color': '#ffffff',
                'foreground-color': '#000000',
                'font-size': this.settings.fontSize
            }
        };
        
        // Set backing store that hterm uses to read/write preferences
        hterm.defaultStorage = new lib.Storage.Memory();
        
        // Set up theme preferences
        Object.keys(themes).forEach(name => {
            Object.keys(themes[name]).forEach(key => {
                hterm.defaultStorage.setItem(`/hterm/profiles/${name}/${key}`, themes[name][key]);
            });
        });
        
        // Initialize message manager for hterm
        this.initMessageManager().then(() => {
            // Initialize hterm
            lib.init(() => {
                this.createTerminal();
            });
        });
    }
    
    async initMessageManager() {
        // Initialize message manager for hterm
        if (!hterm.messageManager) {
            const languages = ['en'];
            hterm.messageManager = new lib.MessageManager(languages);
            
            // Load messages
            try {
                const response = await fetch('js/messages_en.json');
                const messages = await response.json();
                Object.keys(messages).forEach(key => {
                    hterm.messageManager.messages_[key] = messages[key];
                });
            } catch (error) {
                console.warn('Failed to load hterm messages:', error);
            }
        }
    }
    
    createTerminal() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log('Creating WebSocket connection to:', wsUrl);
        
        this.socket = new WebSocket(wsUrl);
        this.socket.onopen = this.runTerminal.bind(this);
        this.socket.onmessage = this.getMessage.bind(this);
        this.socket.onclose = this.closeTerminal.bind(this);
        this.socket.onerror = this.handleError.bind(this);
    }
    
    runTerminal() {
        console.log('WebSocket connected, initializing hterm');
        this.isConnected = true;
        this.updateConnectionStatus(true);
        this.hideLoading();
        
        // Create an instance of hterm.Terminal
        this.term = new hterm.Terminal({ profileId: this.currentTheme });
        
        // Handler that fires when terminal is initialized and ready for use
        this.term.onTerminalReady = () => {
            // Create a new terminal IO object and give it the foreground
            const io = this.term.io.push();
            
            // Set up event handlers for io
            io.onVTKeystroke = this.onVTKeystroke.bind(this);
            io.sendString = this.sendString.bind(this);
            io.onTerminalResize = this.onTerminalResize.bind(this);
            
            // Capture all keyboard input
            this.term.installKeyboard();
        };
        
        // Patch cursor setting
        this.term.options_.cursorVisible = true;
        this.term.options_.cursorBlink = true;
        this.term.options_.cursorColor = '#ffffff';
        
        // Connect terminal to DOM element
        this.term.decorate(this.element);
        this.term.setAccessibilityEnabled(true);
        
        // Warn user if they unload page
        window.onbeforeunload = () => {
            return 'Leaving this page will terminate your terminal session.';
        };
    }
    
    getMessage(ev) {
        if (this.term) {
            this.term.io.print(ev.data);
        }
    }
    
    closeTerminal(ev) {
        console.log('WebSocket closed:', ev.code, ev.reason);
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        // Do not need to warn user if they unload page
        window.onbeforeunload = null;
        
        // Inform user they lost connection
        if (this.term === null) {
            this.showError('Failed to establish a websocket connection. Be sure you are using a browser that supports websocket connections.');
        } else {
            this.term.io.print('\r\nYour connection to the remote server has been terminated.');
        }
    }
    
    handleError(error) {
        console.error('WebSocket error:', error);
        this.showError('连接错误，请检查服务器状态');
    }
    
    onVTKeystroke(str) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                input: str
            }));
        }
    }
    
    sendString(str) {
        // Just like a keystroke, except str was generated by the terminal itself
        this.onVTKeystroke(str);
    }
    
    onTerminalResize(columns, rows) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                resize: {
                    cols: columns,
                    rows: rows
                }
            }));
        }
    }
    
    changeTheme(theme) {
        this.currentTheme = theme;
        if (this.term) {
            this.term.setProfile(theme);
        }
        this.saveSettingsToStorage();
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }
    
    showSettings() {
        this.settingsModal.style.display = 'block';
        this.loadSettingsToForm();
    }
    
    hideSettings() {
        this.settingsModal.style.display = 'none';
    }
    
    loadSettingsToForm() {
        this.fontSizeSlider.value = this.settings.fontSize;
        this.fontSizeValue.textContent = this.settings.fontSize;
        this.cursorBlinkCheckbox.checked = this.settings.cursorBlink;
        this.bellSoundCheckbox.checked = this.settings.bellSound;
    }
    
    saveSettings() {
        this.settings.fontSize = parseInt(this.fontSizeSlider.value);
        this.settings.cursorBlink = this.cursorBlinkCheckbox.checked;
        this.settings.bellSound = this.bellSoundCheckbox.checked;
        
        this.applySettings();
        this.saveSettingsToStorage();
        this.hideSettings();
    }
    
    applySettings() {
        // Apply font size to hterm
        if (this.term) {
            this.term.setFontSize(this.settings.fontSize);
        }
        
        // Apply cursor blink
        if (this.term) {
            this.term.setCursorBlink(this.settings.cursorBlink);
        }
    }
    
    loadSettings() {
        // Load from localStorage
        const savedTheme = localStorage.getItem('minidemand-theme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
            this.themeSelect.value = savedTheme;
        }
        
        const savedSettings = localStorage.getItem('minidemand-settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }
    
    saveSettingsToStorage() {
        localStorage.setItem('minidemand-theme', this.currentTheme);
        localStorage.setItem('minidemand-settings', JSON.stringify(this.settings));
    }
    
    updateConnectionStatus(connected) {
        if (connected) {
            this.connectionStatus.innerHTML = '<i class="fas fa-circle text-success"></i> 已连接';
            this.statusInfo.textContent = '终端已连接';
        } else {
            this.connectionStatus.innerHTML = '<i class="fas fa-circle text-danger"></i> 未连接';
            this.statusInfo.textContent = '终端未连接';
        }
    }
    
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    showError(message) {
        this.statusInfo.textContent = message;
        this.statusInfo.style.color = '#ff6b6b';
    }
    
    increaseFontSize() {
        this.settings.fontSize = Math.min(this.settings.fontSize + 2, 24);
        this.applySettings();
        this.saveSettingsToStorage();
    }
    
    decreaseFontSize() {
        this.settings.fontSize = Math.max(this.settings.fontSize - 2, 8);
        this.applySettings();
        this.saveSettingsToStorage();
    }
    
    resetFontSize() {
        this.settings.fontSize = 14;
        this.applySettings();
        this.saveSettingsToStorage();
    }
    
    init() {
        console.log('MiniDemand Terminal initialized');
        this.showLoading();
    }
}
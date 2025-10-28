/**
 * MiniDemand Terminal Themes
 */

const themes = {
    default: {
        name: '默认',
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#444444',
        colors: {
            black: '#000000',
            red: '#cd0000',
            green: '#00cd00',
            yellow: '#cdcd00',
            blue: '#0000ee',
            magenta: '#cd00cd',
            cyan: '#00cdcd',
            white: '#e5e5e5',
            brightBlack: '#7f7f7f',
            brightRed: '#ff0000',
            brightGreen: '#00ff00',
            brightYellow: '#ffff00',
            brightBlue: '#5c5cff',
            brightMagenta: '#ff00ff',
            brightCyan: '#00ffff',
            brightWhite: '#ffffff'
        }
    },
    dark: {
        name: '深色',
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#404040',
        colors: {
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#ffffff'
        }
    },
    light: {
        name: '浅色',
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        selection: '#b3d4fc',
        colors: {
            black: '#000000',
            red: '#cd3131',
            green: '#00bc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#ffffff'
        }
    },
    'solarized-dark': {
        name: 'Solarized Dark',
        background: '#002b36',
        foreground: '#839496',
        cursor: '#839496',
        selection: '#073642',
        colors: {
            black: '#073642',
            red: '#dc322f',
            green: '#859900',
            yellow: '#b58900',
            blue: '#268bd2',
            magenta: '#d33682',
            cyan: '#2aa198',
            white: '#eee8d5',
            brightBlack: '#002b36',
            brightRed: '#cb4b16',
            brightGreen: '#586e75',
            brightYellow: '#657b83',
            brightBlue: '#839496',
            brightMagenta: '#6c71c4',
            brightCyan: '#93a1a1',
            brightWhite: '#fdf6e3'
        }
    },
    'solarized-light': {
        name: 'Solarized Light',
        background: '#fdf6e3',
        foreground: '#657b83',
        cursor: '#657b83',
        selection: '#eee8d5',
        colors: {
            black: '#073642',
            red: '#dc322f',
            green: '#859900',
            yellow: '#b58900',
            blue: '#268bd2',
            magenta: '#d33682',
            cyan: '#2aa198',
            white: '#eee8d5',
            brightBlack: '#002b36',
            brightRed: '#cb4b16',
            brightGreen: '#586e75',
            brightYellow: '#657b83',
            brightBlue: '#839496',
            brightMagenta: '#6c71c4',
            brightCyan: '#93a1a1',
            brightWhite: '#fdf6e3'
        }
    },
    monokai: {
        name: 'Monokai',
        background: '#272822',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        selection: '#49483e',
        colors: {
            black: '#272822',
            red: '#f92672',
            green: '#a6e22e',
            yellow: '#f4bf75',
            blue: '#66d9ef',
            magenta: '#ae81ff',
            cyan: '#a1efe4',
            white: '#f8f8f2',
            brightBlack: '#75715e',
            brightRed: '#f92672',
            brightGreen: '#a6e22e',
            brightYellow: '#f4bf75',
            brightBlue: '#66d9ef',
            brightMagenta: '#ae81ff',
            brightCyan: '#a1efe4',
            brightWhite: '#f9f8f5'
        }
    }
};

/**
 * Apply theme to the terminal
 * @param {string} themeName - Name of the theme to apply
 */
function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) {
        console.warn(`Theme '${themeName}' not found`);
        return;
    }
    
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--theme-bg', theme.background);
    root.style.setProperty('--theme-fg', theme.foreground);
    root.style.setProperty('--theme-cursor', theme.cursor);
    root.style.setProperty('--theme-selection', theme.selection);
    
    // Apply color palette
    Object.keys(theme.colors).forEach(colorName => {
        root.style.setProperty(`--theme-${colorName}`, theme.colors[colorName]);
    });
    
    // Update terminal styles
    const terminal = document.getElementById('terminal');
    if (terminal) {
        terminal.style.backgroundColor = theme.background;
        terminal.style.color = theme.foreground;
    }
}

/**
 * Get all available themes
 * @returns {Object} Object containing all themes
 */
function getThemes() {
    return themes;
}

/**
 * Get theme by name
 * @param {string} themeName - Name of the theme
 * @returns {Object|null} Theme object or null if not found
 */
function getTheme(themeName) {
    return themes[themeName] || null;
}

/**
 * Initialize theme selector dropdown
 */
function initializeThemeSelector() {
    const themeSelect = document.getElementById('themeSelect');
    if (!themeSelect) return;
    
    // Clear existing options
    themeSelect.innerHTML = '';
    
    // Add theme options
    Object.keys(themes).forEach(themeKey => {
        const option = document.createElement('option');
        option.value = themeKey;
        option.textContent = themes[themeKey].name;
        themeSelect.appendChild(option);
    });
    
    // Set default theme
    const savedTheme = localStorage.getItem('minidemand-theme') || 'default';
    themeSelect.value = savedTheme;
    
    // Apply initial theme
    applyTheme(savedTheme);
}

// Export functions for global access
window.applyTheme = applyTheme;
window.getThemes = getThemes;
window.getTheme = getTheme;
window.initializeThemeSelector = initializeThemeSelector;

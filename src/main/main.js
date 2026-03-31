// src/main/main.js
const { app, BrowserWindow, Menu, ipcMain, shell, nativeTheme, dialog, session } = require('electron');
const path = require('path');

// CORRECTION IMPORT ELECTRON-STORE
const ElectronStore = require('electron-store');
const Store = ElectronStore.default || ElectronStore;

const store = new Store({
    name: 'k-suite-settings',
    defaults: {
        theme: 'system',
        downloadPath: app.getPath('downloads'),
        startOnBoot: false,
        runInBackground: false
    }
});

const AuthService = require('./auth-service');

let mainWindows = [];
let authWindow = null;

function createWindow(url = 'https://ksuite.infomaniak.com/all', options = {}) {
    const isAuth = options.isAuth || false;
    
    const win = new BrowserWindow({
        width: options.width || 1280,
        height: options.height || 800,
        webPreferences: {
            preload: path.join(__dirname, '../renderer/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            partition: 'persist:ksuite',
            webSecurity: false,
            allowRunningInsecureContent: true,
            sandbox: false,
            spellcheck: true
        },
        icon: path.join(__dirname, '../build-resources/icon.ico'),
        show: false,
        backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
        frame: !isAuth,
    });

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    win.webContents.setUserAgent(userAgent);
    session.defaultSession.setUserAgent(userAgent);

    win.webContents.setZoomLevel(store.get('zoomLevel') || 0);

    win.webContents.on('did-finish-load', () => {
        win.show();
        win.focus();
    });

    win.loadURL(url);

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.includes('infomaniak.com') && !url.includes('swisstransfer.com') && !url.includes('127.0.0.1')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Gestion des téléchargements
    win.webContents.session.on('will-download', (event, item) => {
        const savePath = store.get('downloadPath');
        item.setSavePath(path.join(savePath, item.getFilename()));
        
        item.on('updated', (event, state) => {
            if (state === 'progressing' && !item.isPaused()) {
                const progress = item.getReceivedBytes() / item.getTotalBytes();
                mainWindows.forEach(w => w.webContents.send('download-progress', {
                    filename: item.getFilename(),
                    progress: progress
                }));
            }
        });

        item.once('done', (event, state) => {
            if (state === 'completed') {
                mainWindows.forEach(w => w.webContents.send('download-complete', {
                    filename: item.getFilename(),
                    path: item.getSavePath()
                }));
            }
        });
    });

    if (!isAuth) {
        mainWindows.push(win);
        win.on('closed', () => {
            mainWindows = mainWindows.filter(w => w !== win);
        });
    } else {
        authWindow = win;
        win.on('closed', () => { authWindow = null; });
    }

    return win;
}

function createMenu() {
    const template = [
        {
            label: 'K-Suite',
            submenu: [
                { label: 'Nouveau Volet', accelerator: 'CmdOrCtrl+T', click: () => createWindow() },
                { label: 'Paramètres...', click: () => openSettings() },
                { type: 'separator' },
                { label: 'Quitter', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
            ]
        },
        {
            label: 'Édition',
            submenu: [
                { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
                { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
                { type: 'separator' },
                { label: 'Vérification orthographique', type: 'checkbox', checked: true, click: (menuItem) => {
                    mainWindows.forEach(win => win.webContents.session.setSpellCheckerEnabled(menuItem.checked));
                }},
                { label: 'Langue', submenu: [
                    { label: 'Français', click: () => mainWindows.forEach(w => w.webContents.session.setSpellCheckerLanguages(['fr-FR'])) },
                    { label: 'Anglais', click: () => mainWindows.forEach(w => w.webContents.session.setSpellCheckerLanguages(['en-US'])) }
                ]}
            ]
        },
        {
            label: 'Affichage',
            submenu: [
                { label: 'Mode Sombre', type: 'radio', checked: store.get('theme') === 'dark', click: () => setTheme('dark') },
                { label: 'Mode Clair', type: 'radio', checked: store.get('theme') === 'light', click: () => setTheme('light') },
                { label: 'Système', type: 'radio', checked: store.get('theme') === 'system', click: () => setTheme('system') },
                { type: 'separator' },
                { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }
            ]
        },
        {
            label: 'Aide',
            submenu: [
                { label: 'Support Infomaniak', click: () => shell.openExternal('https://www.infomaniak.com/fr/support') },
                { type: 'separator' },
                { label: 'À propos', click: () => dialog.showMessageBox({ type: 'info', title: 'K-Suite', message: 'K-Suite App v2.1.1' }) }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function openSettings() {
    if (mainWindows.length > 0) {
        mainWindows[0].webContents.send('open-settings', store.store);
    }
}

function setTheme(theme) {
    store.set('theme', theme);
    nativeTheme.themeSource = theme;
    mainWindows.forEach(win => win.webContents.send('theme-changed', theme));
}

// Initialisation
app.whenReady().then(async () => {
    createMenu();
    setTheme(store.get('theme'));

    try {
        const token = await AuthService.getToken();
        if (!token) {
            const loginWin = createWindow('about:blank', { width: 550, height: 650, isAuth: true });
            loginWin.loadURL(`data:text/html;charset=utf-8,<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Connexion à Infomaniak</h2><p>Initialisation...</p></body></html>`);
            
            // Note: Tu devras implémenter la logique OAuth dans auth-service si ce n'est pas fait
            // Pour l'instant, on ouvre juste l'app principale après 3 secondes pour tester
            setTimeout(() => {
                loginWin.close();
                createWindow();
            }, 3000);
        } else {
            createWindow();
        }
    } catch (err) {
        console.error("Erreur init:", err);
        createWindow();
    }
});

ipcMain.on('get-settings', (event) => {
    event.reply('settings-loaded', store.store);
});

ipcMain.on('save-settings', (event, newSettings) => {
    store.set(newSettings);
    if (newSettings.theme) setTheme(newSettings.theme);
    if (newSettings.zoomLevel !== undefined) {
        mainWindows.forEach(win => win.webContents.setZoomLevel(newSettings.zoomLevel));
    }
    event.reply('settings-loaded', store.store);
});

ipcMain.handle('change-download-path', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths.length > 0) {
        store.set('downloadPath', result.filePaths[0]);
        return result.filePaths[0];
    }
    return store.get('downloadPath');
});

ipcMain.on('open-downloads-folder', () => {
    shell.openPath(store.get('downloadPath'));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
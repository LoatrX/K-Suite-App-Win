const { app, BrowserWindow, Menu, ipcMain, shell, nativeTheme, dialog, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const AuthManager = require('./auth-service');
const { download } = require('electron-dl'); // Gestion des téléchargements

// Configuration du Store
const store = new Store({
    defaults: {
        theme: 'system',
        zoomLevel: 0,
        autoRefreshInterval: 0,
        downloadPath: app.getPath('downloads'),
        startOnBoot: false,
        runInBackground: false
    }
});

let mainWindows = [];
let authWindow = null;

// --- Création de Fenêtre ---
function createWindow(url = 'https://ksuite.infomaniak.com/all', options = {}) {
    const isAuth = options.isAuth || false;
    
    const win = new BrowserWindow({
        width: options.width || 1280,
        height: options.height || 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            partition: 'persist:ksuite',
            webSecurity: false, 
            allowRunningInsecureContent: true,
            sandbox: false,
            // Activation du correcteur orthographique
            spellcheck: true 
        },
        icon: path.join(__dirname, '../build-resources/icon.ico'),
        show: false,
        backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
        frame: !isAuth,
    });

    // User-Agent pour éviter les blocages
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    win.webContents.setUserAgent(userAgent);
    session.defaultSession.setUserAgent(userAgent);

    win.webContents.setZoomLevel(store.get('zoomLevel'));

    win.webContents.on('did-finish-load', () => {
        win.show();
        win.focus();
    });

    win.loadURL(url);

    // Gestion des liens externes
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.includes('infomaniak.com') && !url.includes('swisstransfer.com') && !url.includes('127.0.0.1')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // --- GESTION DES TÉLÉCHARGEMENTS (Point 5) ---
    // Intercepter les téléchargements pour utiliser electron-dl
    win.webContents.session.on('will-download', (event, item, webContents) => {
        const savePath = store.get('downloadPath');
        item.setSavePath(path.join(savePath, item.getFilename()));
        
        item.on('updated', (event, state) => {
            if (state === 'progressing') {
                if (!item.isPaused()) {
                    // Envoyer la progression à l'interface
                    const progress = item.getReceivedBytes() / item.getTotalBytes();
                    mainWindows.forEach(w => w.webContents.send('download-progress', {
                        filename: item.getFilename(),
                        progress: progress,
                        total: item.getTotalBytes(),
                        received: item.getReceivedBytes()
                    }));
                }
            }
        });

        item.once('done', (event, state) => {
            if (state === 'completed') {
                console.log('Téléchargement terminé:', item.getSavePath());
                mainWindows.forEach(w => w.webContents.send('download-complete', {
                    filename: item.getFilename(),
                    path: item.getSavePath()
                }));
            } else {
                console.log('Téléchargement échoué:', state);
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

// --- Création du Menu (avec Correcteur Orthographique) ---
function createMenu() {
    const template = [
        {
            label: 'K-Suite',
            submenu: [
                { label: 'Nouveau Volet (Double)', accelerator: 'CmdOrCtrl+T', click: () => createWindow() },
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
                // Point 2 : Correcteur Orthographique
                { label: 'Vérification orthographique', type: 'checkbox', checked: true, click: (menuItem) => {
                    mainWindows.forEach(win => {
                        win.webContents.session.setSpellCheckerEnabled(menuItem.checked);
                    });
                }},
                { label: 'Langue du correcteur', submenu: [
                    { label: 'Français (France)', click: () => setSpellLanguage('fr-FR') },
                    { label: 'Anglais (US)', click: () => setSpellLanguage('en-US') },
                    { label: 'Allemand', click: () => setSpellLanguage('de-DE') }
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
                { label: 'Centre d\'aide Infomaniak', click: () => shell.openExternal('https://www.infomaniak.com/fr/support') },
                { label: 'Contacter le support', click: () => shell.openExternal('https://manager.infomaniak.com/v3/support') },
                { type: 'separator' },
                { 
                    label: 'À propos de K-Suite App', 
                    click: () => {
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'À propos',
                            message: 'K-Suite App v1.0',
                            detail: 'Développé par Loan Schöning'
                        });
                    }
                }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function setSpellLanguage(lang) {
    mainWindows.forEach(win => {
        win.webContents.session.setSpellCheckerLanguages([lang]);
    });
}

// --- Gestion des Paramètres (IPC) ---
function openSettings() {
    if (mainWindows.length > 0) {
        mainWindows[0].webContents.send('open-settings', store.store);
    }
}

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

ipcMain.on('logout', () => {
    console.log("Déconnexion demandée");
});

ipcMain.on('open-downloads-folder', () => {
    const pathToOpen = store.get('downloadPath');
    shell.openPath(pathToOpen);
});

function setTheme(theme) {
    store.set('theme', theme);
    if (theme === 'dark') nativeTheme.themeSource = 'dark';
    else if (theme === 'light') nativeTheme.themeSource = 'light';
    else nativeTheme.themeSource = 'system';
    mainWindows.forEach(win => win.webContents.send('theme-changed', theme));
}

// --- Initialisation ---
app.whenReady().then(async () => {
    createMenu();
    setTheme(store.get('theme'));

    try {
        const token = await AuthManager.getToken();
        if (!token) {
            const loginWin = createWindow('about:blank', { width: 550, height: 650, isAuth: true, resizable: false, alwaysOnTop: true });
            loginWin.loadURL(`data:text/html;charset=utf-8,<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>🔐 Connexion</h2><p>Initialisation...</p></body></html>`);
            
            const authResult = await AuthManager.startAuth(loginWin);
            if (authResult.type === 'redirect_needed') {
                loginWin.loadURL(authResult.url);
            }
        } else {
            createWindow();
        }
    } catch (err) {
        console.error("Erreur init:", err);
        const errorWin = new BrowserWindow({ width: 400, height: 300 });
        errorWin.loadURL(`data:text/html;charset=utf-8,<html><body style="font-family:sans-serif;text-align:center;padding:20px;color:red;"><h1>Erreur</h1><p>${err.message}</p></body></html>`);
    }

    setInterval(() => {
        const interval = store.get('autoRefreshInterval');
        if (interval > 0) {
            mainWindows.forEach(win => {
                win.webContents.executeJavaScript(`if (typeof window.refreshKSuiteData === 'function') window.refreshKSuiteData();`);
            });
        }
    }, store.get('autoRefreshInterval') || 0);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
const { app, BrowserWindow, BrowserView, ipcMain, Tray, Menu, nativeTheme, Notification, session, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const authService = require('./auth-service');

const store = new Store({
    defaults: {
        runInBackground: true,
        autoStart: false,
        theme: 'system',
        downloadPath: app.getPath('downloads'),
        viewMode: 1,
        mainApp: 'manager'
    }
});

let mainWindow;
let tray = null;
let views = [];
const TOOLBAR_HEIGHT = 51;
let dividerX = 0.5;
const BORDER_SIZE = 1; // Taille de la bordure entre les volets

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();
        setupSystemTray();
        applySettings();
        setupDownloadManager();
        buildApplicationMenu();
    });
}

// --- GESTION DU MENU (FILE, APPS, AFFICHAGE) ---
function buildApplicationMenu() {
    const isLoggedIn = !!authService.getToken();
    const currentMain = store.get('mainApp');

    const template = [
        {
            label: 'Fichier',
            submenu: [
                {
                    label: currentMain === 'manager' ? 'Passer à K-Suite' : 'Passer au Manager',
                    click: () => {
                        const next = currentMain === 'manager' ? 'ksuite' : 'manager';
                        store.set('mainApp', next);
                        const url = next === 'manager' ? 'https://manager.infomaniak.com/' : 'https://ksuite.infomaniak.com/';
                        views[0].webContents.loadURL(url);
                        buildApplicationMenu();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Se connecter',
                    enabled: !isLoggedIn,
                    click: () => {
                        // Logique de login (ouverture de la page login Infomaniak)
                        views[0].webContents.loadURL('https://login.infomaniak.com/');
                    }
                },
                {
                    label: 'Se déconnecter',
                    enabled: isLoggedIn,
                    click: async () => {
                        const { response } = await dialog.showMessageBox({
                            type: 'question',
                            buttons: ['Annuler', 'Se déconnecter'],
                            title: 'Confirmation',
                            message: 'Voulez-vous vraiment vous déconnecter et supprimer vos cookies de session ?'
                        });

                        if (response === 1) {
                            const sharedSession = session.fromPartition('persist:ksuite_shared');
                            await sharedSession.clearStorageData({
                                storages: ['cookies', 'localstorage', 'cache']
                            });
                            authService.logout();
                            buildApplicationMenu();
                            views.forEach(v => v.webContents.reload());
                        }
                    }
                },
                { type: 'separator' },
                { role: 'quit', label: 'Quitter' }
            ]
        },
        {
            label: 'Apps',
            submenu: [
                { label: 'Mail', click: () => views[0].webContents.loadURL('https://mail.infomaniak.com/') },
                { label: 'kDrive', click: () => views[0].webContents.loadURL('https://kdrive.infomaniak.com/') },
                { label: 'kChat', click: () => views[0].webContents.loadURL('https://kchat.infomaniak.com/') },
                { type: 'separator' },
                {
                    label: 'Collaboratif',
                    submenu: [
                        { label: 'Calendrier', click: () => views[0].webContents.loadURL('https://calendar.infomaniak.com/') },
                        { label: 'Contacts', click: () => views[0].webContents.loadURL('https://contacts.infomaniak.com/') },
                        { label: 'kMeeting', click: () => views[0].webContents.loadURL('https://kmeeting.infomaniak.com/') }
                    ]
                },
                {
                    label: 'Outils',
                    submenu: [
                        { label: 'SwissTransfer', click: () => views[0].webContents.loadURL('https://www.swisstransfer.com/') },
                        { label: 'Gestionnaire de mots de passe', click: () => views[0].webContents.loadURL('https://manager.infomaniak.com/password') }
                    ]
                }
            ]
        },
        {
            label: 'Affichage',
            submenu: [
                { role: 'reload', label: 'Actualiser' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Plein écran (F11)' },
                { role: 'resetzoom', label: 'Zoom réel' },
                { role: 'zoomin', label: 'Zoom avant' },
                { role: 'zoomout', label: 'Zoom arrière' },
                { type: 'separator' },
                { role: 'toggledevtools', label: 'Outils de développement' }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(__dirname, '../../assets/icons/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    setupViews();

    mainWindow.on('resize', () => {
        updateViewsLayout(store.get('viewMode'));
    });
}

function setupViews() {
    const sharedSession = session.fromPartition('persist:ksuite_shared');
    const urls = [
        store.get('mainApp') === 'manager' ? 'https://manager.infomaniak.com/' : 'https://ksuite.infomaniak.com/',
        'https://mail.infomaniak.com/',
        'https://kdrive.infomaniak.com/',
        'https://www.swisstransfer.com/fr'
    ];

    for (let i = 0; i < 4; i++) {
        const view = new BrowserView({
            webPreferences: {
                session: sharedSession,
                preload: path.join(__dirname, '../preload/preload.js')
            }
        });
        view.webContents.loadURL(urls[i]);
        views.push(view);
    }
    
    mainWindow.webContents.on('did-finish-load', () => {
        updateViewsLayout(store.get('viewMode'));
        mainWindow.webContents.send('app-ready');
    });
}

// --- MISE EN PAGE AVEC BORDURES ---
function updateViewsLayout(mode) {
    if (!mainWindow) return;
    const bounds = mainWindow.getContentBounds();
    const contentHeight = bounds.height - TOOLBAR_HEIGHT;
    const width = bounds.width;

    views.forEach(v => { try { mainWindow.removeBrowserView(v); } catch(e) {} });

    if (mode === 1) {
        mainWindow.addBrowserView(views[0]);
        views[0].setBounds({ x: 0, y: TOOLBAR_HEIGHT, width: width, height: contentHeight });
    } else if (mode === 2) {
        const splitPos = Math.floor(width * dividerX);
        mainWindow.addBrowserView(views[0]);
        mainWindow.addBrowserView(views[1]);
        
        // Bordure fine simulée par l'espacement
        views[0].setBounds({ x: 0, y: TOOLBAR_HEIGHT, width: splitPos - BORDER_SIZE, height: contentHeight });
        views[1].setBounds({ x: splitPos + BORDER_SIZE, y: TOOLBAR_HEIGHT, width: width - (splitPos + BORDER_SIZE), height: contentHeight });
    } else if (mode === 4) {
        const w2 = Math.floor(width / 2);
        const h2 = Math.floor(contentHeight / 2);
        views.forEach((v, i) => {
            mainWindow.addBrowserView(v);
            const r = i < 2 ? 0 : h2;
            const c = i % 2 === 0 ? 0 : w2;
            
            // On réduit chaque fenêtre de 1px pour laisser apparaître le fond (bordure)
            v.setBounds({ 
                x: c + BORDER_SIZE, 
                y: TOOLBAR_HEIGHT + r + BORDER_SIZE, 
                width: w2 - (BORDER_SIZE * 2), 
                height: h2 - (BORDER_SIZE * 2) 
            });
        });
    }
}

function setupSystemTray() {
    tray = new Tray(path.join(__dirname, '../../assets/icons/icon.ico'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Ouvrir K-Suite', click: () => mainWindow.show() },
        { type: 'separator' },
        { label: 'Quitter', click: () => { app.isQuiting = true; app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
}

function applySettings() {
    nativeTheme.themeSource = store.get('theme');
}

function setupDownloadManager() {
    session.fromPartition('persist:ksuite_shared').on('will-download', (event, item) => {
        item.setSavePath(path.join(store.get('downloadPath'), item.getFilename()));
    });
}

// --- IPC CHANNELS ---
ipcMain.on('update-divider', (e, xPercent) => {
    dividerX = xPercent;
    updateViewsLayout(store.get('viewMode'));
});

ipcMain.on('go-home', () => {
    const urls = [
        store.get('mainApp') === 'manager' ? 'https://manager.infomaniak.com/' : 'https://ksuite.infomaniak.com/',
        'https://mail.infomaniak.com/',
        'https://kdrive.infomaniak.com/',
        'https://www.swisstransfer.com/fr'
    ];
    views.forEach((v, i) => v.webContents.loadURL(urls[i]));
});

ipcMain.on('change-view-mode', (e, mode) => {
    store.set('viewMode', mode);
    updateViewsLayout(mode);
});

ipcMain.on('search-url', (e, url) => {
    const target = url.startsWith('http') ? url : `https://www.infomaniak.com/fr/recherche?q=${encodeURIComponent(url)}`;
    views[0].webContents.loadURL(target);
});

ipcMain.handle('get-settings', () => store.store);
ipcMain.on('save-setting', (e, key, value) => {
    store.set(key, value);
    if (key === 'theme') applySettings();
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});
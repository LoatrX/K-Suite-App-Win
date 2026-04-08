const { app, BrowserWindow, Menu, MenuItem, ipcMain, shell, nativeTheme, dialog, session } = require('electron');
const path = require('path');

// --- GESTION DU STORE ---
const ElectronStore = require('electron-store');
const Store = ElectronStore.default || ElectronStore;
const store = new Store({
    name: 'k-suite-settings',
    defaults: {
        theme: 'system',
        downloadPath: app.getPath('downloads'),
        zoomLevel: 0
    }
});

const AuthService = require('./auth-service');

let mainWindows = [];

// On définit une partition de session unique pour que les cookies soient partagés
const KSUITE_SESSION_PARTITION = 'persist:ksuite_shared';

function createWindow(url = 'https://ksuite.infomaniak.com/all', options = {}) {
    const win = new BrowserWindow({
        width: options.width || 1280,
        height: options.height || 800,
        webPreferences: {
            preload: path.join(__dirname, '../renderer/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            partition: KSUITE_SESSION_PARTITION, // Session partagée
            spellcheck: true, // Activation du correcteur natif
            webSecurity: true
        },
        icon: path.join(__dirname, '../../assets/icons/icon.ico'),
        show: false,
        backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff'
    });

    // --- CONFIGURATION DU CORRECTEUR (CLIC DROIT) ---
    win.webContents.on('context-menu', (event, params) => {
        const menu = new Menu();

        // Ajout des suggestions d'orthographe si le mot est mal orthographié
        for (const suggestion of params.dictionarySuggestions) {
            menu.append(new MenuItem({
                label: suggestion,
                click: () => win.webContents.replaceMisspelling(suggestion)
            }));
        }

        if (params.dictionarySuggestions.length > 0) {
            menu.append(new MenuItem({ type: 'separator' }));
        }

        // Options standards de texte
        menu.append(new MenuItem({ label: 'Couper', role: 'cut', enabled: params.editFlags.canCut }));
        menu.append(new MenuItem({ label: 'Copier', role: 'copy', enabled: params.editFlags.canCopy }));
        menu.append(new MenuItem({ label: 'Coller', role: 'paste', enabled: params.editFlags.canPaste }));
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(new MenuItem({ label: 'Tout sélectionner', role: 'selectAll' }));

        menu.popup();
    });

    win.webContents.on('did-finish-load', () => {
        win.show();
    });

    win.loadURL(url);
    mainWindows.push(win);
    
    return win;
}

// --- GESTIONNAIRE DE TÉLÉCHARGEMENT ---
function setupDownloadManager() {
    const ses = session.fromPartition(KSUITE_SESSION_PARTITION);
    
    ses.on('will-download', (event, item, webContents) => {
        // Définir le chemin de sauvegarde automatique
        const savePath = store.get('downloadPath');
        const fileName = item.getFilename();
        const fullPath = path.join(savePath, fileName);
        
        item.setSavePath(fullPath);

        item.on('updated', (event, state) => {
            if (state === 'progressing' && !item.isPaused()) {
                const progress = item.getReceivedBytes() / item.getTotalBytes();
                // On peut envoyer l'info au renderer ici si besoin
            }
        });

        item.once('done', (event, state) => {
            if (state === 'completed') {
                // Notifier l'utilisateur
                const { Notification } = require('electron');
                new Notification({ 
                    title: 'Téléchargement terminé', 
                    body: `Le fichier ${fileName} a été enregistré.` 
                }).show();
            } else {
                console.error(`Téléchargement échoué: ${state}`);
            }
        });
    });
}

app.whenReady().then(() => {
    // 1. Configurer les téléchargements AVANT de créer la fenêtre
    setupDownloadManager();
    
    // 2. Configurer la langue du correcteur (Français et Anglais)
    const ses = session.fromPartition(KSUITE_SESSION_PARTITION);
    ses.setSpellCheckerLanguages(['fr-FR', 'en-US']);

    createWindow();
});

// Nettoyage à la fermeture
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
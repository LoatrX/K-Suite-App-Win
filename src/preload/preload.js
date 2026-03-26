const { contextBridge, ipcRenderer } = require('electron');

/**
 * K-Suite Workstation - Preload Script
 * Sécurise l'accès aux APIs Electron pour le rendu.
 */
contextBridge.exposeInMainWorld('api', {
    // --- ÉVÉNEMENTS SYSTÈME ---
    // Signal que l'app est prête (pour cacher le splash screen)
    onAppReady: (callback) => {
        ipcRenderer.on('app-ready', () => callback());
    },
    
    // --- GESTION DES RÉGLAGES ---
    // Récupère tous les paramètres stockés (thème, chemin, etc.)
    getSettings: () => ipcRenderer.invoke('get-settings'),
    
    // Sauvegarde un paramètre spécifique
    saveSetting: (key, value) => ipcRenderer.send('save-setting', key, value),
    
    // --- NAVIGATION ET VUES ---
    // Change le mode de disposition (1, 2 ou 4 volets)
    changeViewMode: (mode) => ipcRenderer.send('change-view-mode', mode),
    
    // Met à jour la position du séparateur en mode 2 volets
    updateDivider: (xPercent) => ipcRenderer.send('update-divider', xPercent),
    
    // Lance une recherche ou ouvre une URL dans le volet principal
    searchUrl: (url) => ipcRenderer.send('search-url', url),
    
    // Réinitialise tous les volets aux URLs par défaut (Home)
    goHome: () => ipcRenderer.send('go-home'),
    
    // --- DIALOGUES ET SYSTÈME ---
    // Ouvre l'explorateur de fichiers pour choisir un dossier de téléchargement
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    
    // Permet d'écouter d'éventuels messages d'erreur ou notifications
    onMessage: (callback) => {
        ipcRenderer.on('display-message', (event, message) => callback(message));
    }
});
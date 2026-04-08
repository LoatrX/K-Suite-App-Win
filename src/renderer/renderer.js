const { ipcRenderer } = require('electron');

let activePanes = 0;
const maxPanes = 2; // Limité à 2 volets maximum
const viewsContainer = document.getElementById('views-container');
const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app-container');

// URLs des services Infomaniak
const SERVICES = {
    dashboard: 'https://ksuite.infomaniak.com/all',
    mail: 'https://mail.infomaniak.com',
    drive: 'https://kdrive.infomaniak.com',
    transfer: 'https://www.swisstransfer.com'
};

/**
 * GESTION DU CHARGEMENT (SPLASH SCREEN)
 * On attend que le Main Process confirme que tout est prêt
 */
window.addEventListener('DOMContentLoaded', () => {
    // On simule un temps de chargement minimum pour laisser l'animation respirer
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.classList.add('hidden');
                if (appContainer) appContainer.classList.remove('hidden');
                
                // On ouvre le dashboard par défaut au démarrage
                if (activePanes === 0) openView('dashboard');
            }, 500);
        }
    }, 1500);

    setupEventListeners();
    setupDownloadButton();
    loadSettings();
});

/**
 * GESTION DES VOLETS (PANES)
 */
function openView(serviceKey) {
    if (activePanes >= maxPanes) {
        // Remplacer l'alerte par un message plus discret si nécessaire
        console.log('Maximum de volets atteints.');
        return;
    }
    const url = SERVICES[serviceKey] || serviceKey;
    createPane(serviceKey.toUpperCase(), url);
}

function createPane(title, url) {
    const pane = document.createElement('div');
    pane.className = 'view-pane';
    
    const header = document.createElement('div');
    header.className = 'pane-header';
    header.innerHTML = `
        <div class="pane-title">${title}</div>
        <div class="close-pane" title="Fermer">×</div>
    `;
    
    // Utilisation de webview (Assure-toi que webviewTag: true est bien dans main.js)
    const webview = document.createElement('webview');
    webview.src = url;
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('partition', 'persist:ksuite_shared'); // Très important pour les téléchargements et l'orthographe
    webview.style.flex = '1';
    webview.style.width = '100%';
    webview.style.height = '100%';

    pane.appendChild(header);
    pane.appendChild(webview);
    viewsContainer.appendChild(pane);

    // Fermeture du volet
    header.querySelector('.close-pane').addEventListener('click', () => {
        pane.remove();
        activePanes--;
        updateLayout();
    });

    activePanes++;
    updateLayout();
}

function updateLayout() {
    viewsContainer.className = ''; // Reset des classes
    if (activePanes === 1) viewsContainer.classList.add('grid-1');
    else if (activePanes >= 2) viewsContainer.classList.add('grid-2');
}

/**
 * BARRE D'OUTILS ET BOUTONS
 */
function setupEventListeners() {
    // Bouton 1 Volet
    document.getElementById('btn-view-1')?.addEventListener('click', () => {
        const panes = document.querySelectorAll('.view-pane');
        if (panes.length > 1) {
            for (let i = 1; i < panes.length; i++) panes[i].remove();
            activePanes = 1;
            updateLayout();
        }
        setActiveBtn('btn-view-1');
    });

    // Bouton 2 Volets
    document.getElementById('btn-view-2')?.addEventListener('click', () => {
        if (activePanes < 2) openView('mail'); // Ouvre Mail par défaut en 2ème volet
        setActiveBtn('btn-view-2');
    });

    // Recherche / URL
    document.getElementById('search-btn')?.addEventListener('click', () => {
        const urlInput = document.getElementById('url-input');
        const url = urlInput.value.trim();
        if (url.includes('infomaniak.com') || url.includes('swisstransfer.com')) {
            openView(url);
            urlInput.value = '';
        }
    });

    // Paramètres
    const modal = document.getElementById('settings-modal');
    document.getElementById('settings-btn')?.addEventListener('click', () => {
        modal.classList.add('active');
    });
    
    document.getElementById('close-settings')?.addEventListener('click', () => {
        modal.classList.remove('active');
    });
}

function setActiveBtn(id) {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
}

/**
 * GESTION DES TÉLÉCHARGEMENTS (UI)
 */
function setupDownloadButton() {
    const badge = document.getElementById('dl-badge');
    const dlList = document.getElementById('dl-list');

    ipcRenderer.on('download-progress', (event, data) => {
        if (badge) {
            badge.classList.remove('hidden');
            badge.innerText = Math.round(data.progress * 100) + '%';
        }
    });

    ipcRenderer.on('download-complete', (event, data) => {
        if (badge) badge.classList.add('hidden');
        
        const div = document.createElement('div');
        div.className = 'dl-item';
        div.innerHTML = `
            <span class="dl-name">${data.filename}</span>
            <span class="dl-status">Terminé</span>
        `;
        dlList?.prepend(div);
    });
}

/**
 * PARAMÈTRES ET SYNCHRONISATION
 */
function loadSettings() {
    ipcRenderer.invoke('get-settings').then(settings => {
        updateSettingsUI(settings);
    });
}

function updateSettingsUI(settings) {
    const themeSelect = document.getElementById('select-theme');
    const pathInput = document.getElementById('input-download-path');
    
    if (themeSelect) themeSelect.value = settings.theme || 'system';
    if (pathInput) pathInput.value = settings.downloadPath || '';
}

// Export pour le bouton "Modifier le dossier"
window.browseDownloadPath = () => {
    ipcRenderer.invoke('select-folder').then(path => {
        if (path) document.getElementById('input-download-path').value = path;
    });
};
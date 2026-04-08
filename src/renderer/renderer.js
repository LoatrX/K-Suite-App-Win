const { ipcRenderer } = require('electron');

let activePanes = 0;
const maxPanes = 2;
const viewsContainer = document.getElementById('views-container');
const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app-container');

const SERVICES = {
    dashboard: 'https://ksuite.infomaniak.com/all',
    manager: 'https://manager.infomaniak.com',
    mail: 'https://mail.infomaniak.com',
    drive: 'https://kdrive.infomaniak.com',
    transfer: 'https://www.swisstransfer.com'
};

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.classList.add('hidden');
                if (appContainer) appContainer.classList.remove('hidden');
                if (activePanes === 0) openView('dashboard');
            }, 500);
        }
    }, 1500);

    setupEventListeners();
    setupDownloadButton();
});

function openView(serviceKey) {
    if (activePanes >= maxPanes) return;
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
    
    const webview = document.createElement('webview');
    webview.src = url;
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('partition', 'persist:ksuite_shared'); // Liaison avec la session du Main Process
    webview.style.flex = '1';

    // IMPORTANT : On relaie le clic droit de la webview vers le menu d'Electron
    webview.addEventListener('context-menu', (e) => {
        // Electron gère automatiquement si spellcheck est true dans le partition
    });

    pane.appendChild(header);
    pane.appendChild(webview);
    viewsContainer.appendChild(pane);

    header.querySelector('.close-pane').addEventListener('click', () => {
        pane.remove();
        activePanes--;
        updateLayout();
    });

    activePanes++;
    updateLayout();
}

function updateLayout() {
    viewsContainer.className = '';
    if (activePanes === 1) viewsContainer.classList.add('grid-1');
    else if (activePanes >= 2) viewsContainer.classList.add('grid-2');
}

function setupEventListeners() {
    // Bouton Switcher K-Suite / Manager
    const switchBtn = document.getElementById('btn-switch-service');
    let currentMainService = 'dashboard';

    switchBtn?.addEventListener('click', () => {
        // Fermer le premier volet (le principal)
        const panes = document.querySelectorAll('.view-pane');
        if (panes.length > 0) panes[0].remove();
        activePanes--;

        // Basculer le service
        currentMainService = (currentMainService === 'dashboard') ? 'manager' : 'dashboard';
        
        // Ouvrir le nouveau service en première position
        const url = SERVICES[currentMainService];
        createPane(currentMainService.toUpperCase(), url);
        
        // Mettre à jour l'icône ou le texte du bouton si besoin
        switchBtn.innerText = currentMainService === 'dashboard' ? 'Vers Manager' : 'Vers K-Suite';
    });

    // Autres boutons...
    document.getElementById('btn-view-1')?.addEventListener('click', () => {
        const panes = document.querySelectorAll('.view-pane');
        while (panes.length > 1) { panes[panes.length - 1].remove(); activePanes--; }
        updateLayout();
    });
}

function setupDownloadButton() {
    const badge = document.getElementById('dl-badge');
    ipcRenderer.on('download-progress', (event, data) => {
        if (badge) {
            badge.classList.remove('hidden');
            badge.innerText = Math.round(data.progress * 100) + '%';
        }
    });
    ipcRenderer.on('download-complete', (event, data) => {
        if (badge) badge.classList.add('hidden');
        alert(`Téléchargement terminé : ${data.filename}`);
    });
}
const { ipcRenderer } = require('electron');

let activePanes = 0;
const maxPanes = 2; // Limité à 2 comme demandé
const viewsContainer = document.getElementById('views-container');
const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app-container');

// URLs des services
const SERVICES = {
    dashboard: 'https://ksuite.infomaniak.com/all',
    mail: 'https://mail.infomaniak.com',
    drive: 'https://kdrive.infomaniak.com',
    transfer: 'https://www.swisstransfer.com'
};

// Initialisation
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.style.display = 'none';
            appContainer.style.display = 'block';
            openView('dashboard');
        }, 500);
    }, 2000);

    setupEventListeners();
    setupDownloadButton();
    loadSettings();
});

// Gestion des volets
function openView(serviceKey) {
    if (activePanes >= maxPanes) {
        alert('Maximum de 2 volets atteints. Fermez-en un pour en ouvrir un autre.');
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
    header.innerHTML = `<span>${title}</span><span class="close-pane">×</span>`;
    
    const webview = document.createElement('webview');
    webview.src = url;
    webview.setAttribute('allowpopups', 'true');
    webview.style.flex = '1';

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
    viewsContainer.className = ''; // Reset
    if (activePanes === 1) viewsContainer.classList.add('grid-1');
    else if (activePanes >= 2) viewsContainer.classList.add('grid-2');
}

// Boutons de vue
document.getElementById('btn-view-1').addEventListener('click', () => {
    if (activePanes > 1) {
        // Fermer les volets supplémentaires
        const panes = document.querySelectorAll('.view-pane');
        for (let i = 1; i < panes.length; i++) panes[i].remove();
        activePanes = 1;
    }
    updateLayout();
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-view-1').classList.add('active');
});

document.getElementById('btn-view-2').addEventListener('click', () => {
    if (activePanes < 2) openView('dashboard');
    updateLayout();
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-view-2').classList.add('active');
});

// Recherche
document.getElementById('search-btn').addEventListener('click', () => {
    const url = document.getElementById('url-input').value;
    if (url.includes('infomaniak.com') || url.includes('swisstransfer.com')) {
        openView(url);
    } else {
        alert('Veuillez entrer un lien valide Infomaniak ou SwissTransfer.');
    }
});

// Paramètres
const modal = document.getElementById('settings-modal');
document.getElementById('settings-btn').addEventListener('click', () => {
    loadSettings();
    modal.classList.add('active');
});
document.getElementById('close-settings').addEventListener('click', () => modal.classList.remove('active'));
document.getElementById('save-settings-btn').addEventListener('click', () => {
    const settings = {
        theme: document.getElementById('select-theme').value,
        downloadPath: document.getElementById('setting-download-path').value,
        startOnBoot: document.getElementById('check-autostart').checked,
        runInBackground: document.getElementById('check-background').checked
    };
    ipcRenderer.send('save-settings', settings);
    modal.classList.remove('active');
    alert('Paramètres enregistrés !');
});

function loadSettings() {
    ipcRenderer.send('get-settings');
}

ipcRenderer.on('settings-loaded', (event, settings) => {
    document.getElementById('select-theme').value = settings.theme || 'system';
    document.getElementById('setting-download-path').value = settings.downloadPath || '';
    document.getElementById('check-autostart').checked = settings.startOnBoot || false;
    document.getElementById('check-background').checked = settings.runInBackground || false;
});

document.getElementById('btn-browse-path').addEventListener('click', () => {
    // Demande au processus principal d'ouvrir le dialog
    ipcRenderer.invoke('change-download-path').then(path => {
        document.getElementById('setting-download-path').value = path;
    });
});

// Gestion des téléchargements (Point 5)
function setupDownloadButton() {
    const btn = document.getElementById('btn-downloads');
    const dropdown = document.getElementById('dl-dropdown');
    const dlList = document.getElementById('dl-list');
    const badge = document.getElementById('dl-badge');

    btn.addEventListener('mouseenter', () => { dropdown.style.display = 'block'; });
    dropdown.addEventListener('mouseleave', () => { setTimeout(() => dropdown.style.display = 'none', 200); });

    // Réception des événements du processus principal
    ipcRenderer.on('download-progress', (event, data) => {
        badge.style.display = 'block';
        badge.innerText = Math.round(data.progress * 100) + '%';
        btn.style.color = '#0070f3';
        
        // Mise à jour liste
        const item = dlList.querySelector(`[data-file="${data.filename}"]`);
        if (item) {
            item.querySelector('.status').innerText = `${Math.round(data.progress * 100)}%`;
        }
    });

    ipcRenderer.on('download-complete', (event, data) => {
        badge.style.display = 'none';
        btn.style.color = '';
        
        const div = document.createElement('div');
        div.className = 'dl-item';
        div.setAttribute('data-file', data.filename);
        div.innerHTML = `<span>${data.filename}</span><span class="status" style="color:green">Terminé</span>`;
        dlList.prepend(div);
        
        if (dlList.innerText.includes('Aucun')) dlList.innerHTML = '';
        dlList.prepend(div);
    });
}

window.openDownloadsFolder = function() {
    ipcRenderer.send('open-downloads-folder');
};

function setupEventListeners() {
    // Ajoute ici d'autres écouteurs si nécessaire
}
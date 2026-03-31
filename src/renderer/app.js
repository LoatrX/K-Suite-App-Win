let activePanes = 0;
const maxPanes = 2; // Point 1 : Max 2 volets
let settingsModal = null;
let downloadHistory = []; // Historique des téléchargements

const SERVICES = {
    dashboard: 'https://ksuite.infomaniak.com/all',
    mail: 'https://mail.infomaniak.com',
    drive: 'https://kdrive.infomaniak.com',
    chat: 'https://kchat.infomaniak.com',
    meet: 'https://kmeet.infomaniak.com',
    transfer: 'https://www.swisstransfer.com',
    manager: 'https://manager.infomaniak.com'
};

const viewsContainer = document.getElementById('views-container');
const loaderScreen = document.getElementById('loader-screen');
const appInterface = document.getElementById('app-interface');

window.addEventListener('DOMContentLoaded', () => {
    settingsModal = document.getElementById('settings-modal');
    
    setTimeout(() => {
        if(loaderScreen) loaderScreen.style.display = 'none';
        if(appInterface) appInterface.style.display = 'flex';
        openView('dashboard');
    }, 1500);

    setupEventListeners();
    loadSettings();
    setupDownloadButton(); // Point 5
});

function openView(serviceKey) {
    if (activePanes >= maxPanes) {
        alert('Maximum de 2 volets atteints.');
        return;
    }
    const url = SERVICES[serviceKey];
    if (!url) return;
    createPane(serviceKey.toUpperCase(), url);
}

function createPane(title, url) {
    const pane = document.createElement('div');
    pane.className = 'view-pane';
    pane.id = `pane-${Date.now()}`;
    
    const header = document.createElement('div');
    header.className = 'pane-header';
    header.innerHTML = `<span>${title}</span><span class="close-pane">×</span>`;
    
    const webview = document.createElement('webview');
    webview.src = url;
    webview.className = 'pane-webview';
    webview.setAttribute('allowpopups', 'true');

    pane.appendChild(header);
    pane.appendChild(webview);
    if(viewsContainer) viewsContainer.appendChild(pane);

    header.querySelector('.close-pane').addEventListener('click', () => {
        pane.remove();
        activePanes--;
        updateGridLayout();
    });

    activePanes++;
    updateGridLayout();
}

function updateGridLayout() {
    if (!viewsContainer) return;
    viewsContainer.className = 'views-container';
    if (activePanes === 1) viewsContainer.classList.add('layout-1');
    else if (activePanes >= 2) viewsContainer.classList.add('layout-2');
}

// --- Point 5 : Bouton Téléchargements ---
function setupDownloadButton() {
    const dlBtn = document.getElementById('btn-downloads');
    const dlDropdown = document.getElementById('dl-dropdown');
    
    if (!dlBtn || !dlDropdown) return;

    // Ouvrir le dossier au clic
    dlBtn.addEventListener('click', () => {
        if (window.ksuiteAPI) window.ksuiteAPI.send('open-downloads-folder', null);
    });

    // Afficher/Masquer la liste au survol
    dlBtn.addEventListener('mouseenter', () => {
        dlDropdown.style.display = 'block';
        renderDownloadList();
    });
    
    dlDropdown.addEventListener('mouseleave', () => {
        setTimeout(() => { dlDropdown.style.display = 'none'; }, 200);
    });

    // Écouter la progression
    if (window.ksuiteAPI) {
        window.ksuiteAPI.on('download-progress', (data) => {
            updateDownloadStatus(data);
        });
        window.ksuiteAPI.on('download-complete', (data) => {
            downloadHistory.unshift(data); // Ajouter au début
            if (downloadHistory.length > 5) downloadHistory.pop(); // Garder les 5 derniers
            renderDownloadList();
        });
    }
}

function updateDownloadStatus(data) {
    const dlBtn = document.getElementById('btn-downloads');
    const percent = Math.round(data.progress * 100);
    
    // Animation simple : changer l'opacité ou ajouter un badge
    dlBtn.style.opacity = '1';
    dlBtn.title = `Téléchargement en cours : ${data.filename} (${percent}%)`;
    
    // Ici on pourrait ajouter un cercle SVG animé autour du bouton
    // Pour simplifier, on change juste l'icône ou la couleur
    dlBtn.style.color = '#0091ff';
}

function renderDownloadList() {
    const dlDropdown = document.getElementById('dl-dropdown');
    if (!dlDropdown) return;

    if (downloadHistory.length === 0) {
        dlDropdown.innerHTML = '<div style="padding:10px;">Aucun téléchargement récent</div>';
        return;
    }

    let html = '<ul style="list-style:none;margin:0;padding:0;">';
    downloadHistory.forEach(file => {
        const time = new Date().toLocaleTimeString();
        html += `
            <li style="padding:8px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:bold;font-size:0.9em;">${file.filename}</div>
                    <div style="font-size:0.8em;color:#666;">${time}</div>
                </div>
                <button onclick="window.ksuiteAPI.send('open-downloads-folder', null)" style="cursor:pointer;">📂</button>
            </li>
        `;
    });
    html += '</ul>';
    dlDropdown.innerHTML = html;
}

// --- Paramètres ---
function loadSettings() {
    if (window.ksuiteAPI) window.ksuiteAPI.send('get-settings', null);
}

if (window.ksuiteAPI) {
    window.ksuiteAPI.on('settings-loaded', (settings) => {
        if (!settingsModal) return;
        document.getElementById('setting-theme').value = settings.theme || 'system';
        document.getElementById('setting-zoom').value = settings.zoomLevel || 0;
        document.getElementById('setting-refresh').value = settings.autoRefreshInterval || 0;
        document.getElementById('setting-download-path').value = settings.downloadPath || '';
        settingsModal.style.display = 'block';
    });
}

document.querySelector('.close-modal')?.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const newSettings = {
        theme: document.getElementById('setting-theme').value,
        zoomLevel: parseFloat(document.getElementById('setting-zoom').value),
        autoRefreshInterval: parseInt(document.getElementById('setting-refresh').value),
        downloadPath: document.getElementById('setting-download-path').value
    };
    if (window.ksuiteAPI) {
        window.ksuiteAPI.send('save-settings', newSettings);
        window.ksuiteAPI.setZoom(newSettings.zoomLevel);
    }
    alert('Paramètres enregistrés !');
    settingsModal.style.display = 'none';
});

// --- Navigation & Events ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        openView(e.target.dataset.view);
    });
});

function setupEventListeners() {
    document.getElementById('btn-settings')?.addEventListener('click', loadSettings);
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        if(confirm("Déconnexion ?")) {
            if(window.ksuiteAPI) window.ksuiteAPI.send('logout', null);
            window.location.reload();
        }
    });
}

window.refreshKSuiteData = function() {
    document.querySelectorAll('webview').forEach(wv => wv.reload());
};

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); window.refreshKSuiteData(); }
    if (e.key === 'F5') { e.preventDefault(); window.refreshKSuiteData(); }
});
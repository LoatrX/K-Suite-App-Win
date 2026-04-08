/**
 * K-Suite Workstation - Renderer Script
 * Gère les vues, l'interface et les interactions utilisateur.
 */

let activePanes = 0;
const maxPanes = 4; // Autorise jusqu'à 4 vues pour la grille
const viewsContainer = document.getElementById('views-container');
const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app-container');
const settingsModal = document.getElementById('settings-modal');

const SERVICES = {
    dashboard: 'https://ksuite.infomaniak.com/all',
    manager: 'https://manager.infomaniak.com',
    mail: 'https://mail.infomaniak.com',
    drive: 'https://kdrive.infomaniak.com',
    calendar: 'https://calendar.infomaniak.com',
    kchat: 'https://kchat.infomaniak.com'
};

// --- INITIALISATION ---

window.api.onAppReady(() => {
    // Petit délai pour laisser l'animation de la barre de progression se terminer
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            // Retrait du flou et scale sur l'app container
            if (appContainer) appContainer.classList.remove('loading-transition');
            
            setTimeout(() => {
                splashScreen.classList.add('hidden');
                // Si aucune vue n'est ouverte, on lance le dashboard
                if (activePanes === 0) openView('dashboard');
            }, 800);
        }
    }, 1500);
});

// --- GESTION DES VUES ---

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
        <span class="pane-title">${title}</span>
        <span class="close-pane" title="Fermer">✕</span>
    `;
    
    const webview = document.createElement('webview');
    webview.src = url;
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('partition', 'persist:ksuite_shared');
    webview.style.flex = '1';

    pane.appendChild(header);
    pane.appendChild(webview);
    viewsContainer.appendChild(pane);

    // Event : Fermeture du volet
    header.querySelector('.close-pane').onclick = () => {
        pane.remove();
        activePanes--;
        updateLayout();
    };

    activePanes++;
    updateLayout();
}

function updateLayout() {
    // Réinitialise les classes de grille
    viewsContainer.classList.remove('grid-1', 'grid-2', 'grid-4');
    
    if (activePanes === 1) viewsContainer.classList.add('grid-1');
    else if (activePanes === 2) viewsContainer.classList.add('grid-2');
    else if (activePanes > 2) viewsContainer.classList.add('grid-4');
}

// --- ÉVÉNEMENTS INTERFACE ---

function setupEventListeners() {
    // 1. Bouton Switch Manager / K-Suite
    const switchBtn = document.getElementById('btn-switch-manager');
    let isManagerMode = false;

    switchBtn?.addEventListener('click', () => {
        const panes = document.querySelectorAll('.view-pane');
        if (panes.length > 0) panes[0].remove();
        activePanes--;

        isManagerMode = !isManagerMode;
        const targetService = isManagerMode ? 'manager' : 'dashboard';
        
        openView(targetService);
        
        // Mise à jour du texte du bouton
        switchBtn.innerHTML = isManagerMode ? 
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> Vers K-Suite` : 
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"></path></svg> Switch to Manager`;
    });

    // 2. Boutons de changement de grille rapides
    document.getElementById('btn-view-1')?.addEventListener('click', () => {
        const panes = document.querySelectorAll('.view-pane');
        while (panes.length > 1) { 
            panes[panes.length - 1].remove(); 
            activePanes--; 
        }
        updateLayout();
        setActiveIconBtn('btn-view-1');
    });

    document.getElementById('btn-view-2')?.addEventListener('click', () => {
        if (activePanes < 2) openView('mail');
        updateLayout();
        setActiveIconBtn('btn-view-2');
    });

    document.getElementById('btn-view-4')?.addEventListener('click', () => {
        while (activePanes < 4) {
            const keys = ['drive', 'calendar', 'kchat'];
            openView(keys[activePanes - 1] || 'dashboard');
        }
        updateLayout();
        setActiveIconBtn('btn-view-4');
    });

    // 3. Recherche / URL
    const searchInput = document.getElementById('search-input');
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = searchInput.value;
            const url = val.includes('.') ? 
                (val.startsWith('http') ? val : `https://${val}`) : 
                `https://www.google.com/search?q=${encodeURIComponent(val)}`;
            
            const firstWebview = document.querySelector('webview');
            if (firstWebview) firstWebview.src = url;
        }
    });

    // 4. Modale Paramètres
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    document.getElementById('close-settings')?.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    document.getElementById('btn-browse-path')?.addEventListener('click', async () => {
        const path = await window.api.selectFolder();
        if (path) document.getElementById('download-path').value = path;
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
        const isDark = document.getElementById('dark-mode-toggle').checked;
        const dlPath = document.getElementById('download-path').value;
        
        if (isDark) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        
        window.api.saveSetting('darkMode', isDark);
        window.api.saveSetting('downloadPath', dlPath);
        
        settingsModal.classList.remove('active');
    });
}

function setActiveIconBtn(id) {
    document.querySelectorAll('.nav-actions .icon-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});
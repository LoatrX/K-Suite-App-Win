/**
 * K-Suite Workstation - Renderer Process
 * Gère les interactions de l'interface utilisateur, les paramètres et les animations.
 */

// Éléments UI
const urlInput = document.getElementById('url-input');
const searchBtn = document.getElementById('search-btn');
const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app-container');
const toolbar = document.querySelector('.toolbar');

// Éléments Modale Paramètres
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const themeSelect = document.getElementById('select-theme');
const downloadPathInput = document.getElementById('input-download-path');
const browsePathBtn = document.getElementById('btn-browse-path');
const autoStartCheck = document.getElementById('check-autostart');
const backgroundCheck = document.getElementById('check-background');

// 1. GESTION DU DÉMARRAGE (Splash Screen)
window.api.onAppReady(() => {
    if (splashScreen) {
        splashScreen.style.opacity = '0';
        splashScreen.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            splashScreen.style.display = 'none';
            if (appContainer) {
                appContainer.style.display = 'block';
                appContainer.style.animation = 'fadeIn 0.8s ease-out';
            }
        }, 500);
    }
});

// 2. BARRE DE RECHERCHE ET ANIMATIONS NAV
if (searchBtn && urlInput) {
    const executeSearch = () => {
        const query = urlInput.value.trim();
        if (query) window.api.searchUrl(query);
    };

    searchBtn.onclick = executeSearch;
    urlInput.onkeypress = (e) => {
        if (e.key === 'Enter') executeSearch();
    };
}

// Animation fluide de la toolbar au survol
if (toolbar) {
    window.addEventListener('mousemove', (e) => {
        if (e.clientY < 60) {
            toolbar.style.transform = 'translateY(0)';
            toolbar.style.opacity = '1';
        }
    });
}

// 3. LOGO / BRANDING (Retour à l'accueil)
const branding = document.querySelector('.branding');
if (branding) {
    branding.onclick = () => {
        // Animation de retour
        branding.style.transform = 'scale(0.95)';
        setTimeout(() => branding.style.transform = 'scale(1)', 100);
        window.api.goHome();
    };
}

// 4. BOUTONS DE CHANGEMENT DE VUE
const setupViewButton = (id, mode) => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.onclick = () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.api.changeViewMode(mode);
        };
    }
};

setupViewButton('btn-view-1', 1);
setupViewButton('btn-view-2', 2);
setupViewButton('btn-view-4', 4);

// 5. GESTION DES PARAMÈTRES (MODALE & SAVE)
if (settingsBtn && settingsModal) {
    settingsBtn.onclick = () => {
        settingsModal.classList.add('active');
    };
}

if (closeSettings) {
    closeSettings.onclick = () => {
        settingsModal.classList.remove('active');
    };
}

// Fermer la modale en cliquant à côté
window.onclick = (event) => {
    if (event.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
};

// Événements de sauvegarde des réglages
if (themeSelect) {
    themeSelect.onchange = (e) => window.api.saveSetting('theme', e.target.value);
}

if (autoStartCheck) {
    autoStartCheck.onchange = (e) => window.api.saveSetting('autoStart', e.target.checked);
}

if (backgroundCheck) {
    backgroundCheck.onchange = (e) => window.api.saveSetting('runInBackground', e.target.checked);
}

if (browsePathBtn) {
    browsePathBtn.onclick = async () => {
        const path = await window.api.selectFolder();
        if (path) {
            downloadPathInput.value = path;
            window.api.saveSetting('downloadPath', path);
        }
    };
}

// 6. INITIALISATION DES DONNÉES
async function initializeUI() {
    try {
        const settings = await window.api.getSettings();
        
        // Appliquer le mode de vue
        const currentMode = settings.viewMode || 1;
        window.api.changeViewMode(currentMode);
        const activeBtn = document.getElementById(`btn-view-${currentMode}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Remplir la modale avec les valeurs actuelles
        if (themeSelect) themeSelect.value = settings.theme || 'system';
        if (downloadPathInput) downloadPathInput.value = settings.downloadPath || '';
        if (autoStartCheck) autoStartCheck.checked = settings.autoStart || false;
        if (backgroundCheck) backgroundCheck.checked = settings.runInBackground || false;

    } catch (error) {
        console.error("Erreur d'initialisation du renderer:", error);
    }
}

initializeUI();
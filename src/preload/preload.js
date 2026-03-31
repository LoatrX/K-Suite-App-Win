const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('ksuiteAPI', {
    send: (channel, data) => {
        const validChannels = ['save-settings', 'get-settings', 'trigger-refresh', 'logout', 'open-downloads-folder'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    on: (channel, callback) => {
        const validChannels = ['settings-loaded', 'theme-changed', 'download-progress', 'download-complete'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    setZoom: (level) => webFrame.setZoomLevel(level)
});

window.addEventListener('DOMContentLoaded', () => {
    // Drag & Drop
    document.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }, { passive: false });
    document.addEventListener('drop', (e) => { e.preventDefault(); }, { passive: false });

    // Injection Cookies & Refresh
    const script = document.createElement('script');
    script.textContent = 
        (function() {
            function autoAcceptCookies() {
                const selectors = ['button[data-testid="cookie-accept"]', 'button[class*="accept"]', '.cookie-btn', '#onetrust-accept-btn'];
                for (let s of selectors) {
                    const btn = document.querySelector(s);
                    if (btn) { btn.click(); return true; }
                }
                return false;
            }
            if (!autoAcceptCookies()) {
                const observer = new MutationObserver(() => { if (autoAcceptCookies()) observer.disconnect(); });
                observer.observe(document.body, { childList: true, subtree: true });
            }
            window.refreshKSuiteData = function() { console.log('Refresh K-Suite'); };
        })();
    ;
    document.head.appendChild(script);
});
// src/modules/secure-storage.js
const { safeStorage } = require('electron');
const ElectronStore = require('electron-store');

// Gestion de l'import pour les versions récentes (ES6 vs CommonJS)
const Store = ElectronStore.default || ElectronStore;

// Initialisation UNIQUE du store
const store = new Store({
    name: 'k-suite-settings',
    defaults: {
        theme: 'system',
        downloadPath: '',
        startOnBoot: false,
        runInBackground: false,
        auth_email: ''
    }
});

const SecureStorage = {
    setSecure(key, value) {
        if (!safeStorage.isEncryptionAvailable()) {
            console.warn('Chiffrement non disponible, stockage en clair.');
            store.set(key, value);
            return true;
        }
        try {
            const encrypted = safeStorage.encryptString(value);
            store.set(key, encrypted.toString('base64'));
            return true;
        } catch (e) {
            console.error("Erreur chiffrement:", e);
            return false;
        }
    },

    getSecure(key) {
        const data = store.get(key);
        if (!data) return null;
        try {
            if (safeStorage.isEncryptionAvailable()) {
                return safeStorage.decryptString(Buffer.from(data, 'base64'));
            } else {
                return data;
            }
        } catch (e) {
            console.error("Erreur déchiffrement:", e);
            return null;
        }
    },

    set(key, value) {
        store.set(key, value);
    },

    get(key, defaultValue) {
        return store.get(key, defaultValue);
    },

    delete(key) {
        store.delete(key);
    }
};

module.exports = SecureStorage;
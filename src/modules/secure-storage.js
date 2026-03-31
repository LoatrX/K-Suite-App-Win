const { safeStorage } = require('electron');
const Store = require('electron-store');

// Initialisation UNIQUE du Store avec schéma
const store = new Store({
    name: 'k-suite-settings',
    defaults: {
        theme: 'system',
        downloadPath: '',
        startOnBoot: false,
        runInBackground: false,
        auth_email: '' // Ajout pour stocker l'email simplement
    }
});

const SecureStorage = {
    // Sauvegarde une donnée sensible (chiffrée)
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

    // Lit une donnée sensible (déchiffre)
    getSecure(key) {
        const data = store.get(key);
        if (!data) return null;

        // Si ce n'est pas chiffré (cas de repli), on retourne tel quel
        if (typeof data === 'string' && !data.includes('=')) return data;

        try {
            if (safeStorage.isEncryptionAvailable()) {
                return safeStorage.decryptString(Buffer.from(data, 'base64'));
            } else {
                return data; // Retourne en clair si pas de chiffrement
            }
        } catch (e) {
            console.error("Erreur déchiffrement:", e);
            return null;
        }
    },

    // Sauvegarde une donnée normale (non chiffrée)
    set(key, value) {
        store.set(key, value);
    },

    // Lit une donnée normale
    get(key, defaultValue) {
        return store.get(key, defaultValue);
    },

    delete(key) {
        store.delete(key);
    }
};

module.exports = SecureStorage;
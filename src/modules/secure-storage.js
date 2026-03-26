const { safeStorage } = require('electron');
const Store = require('electron-store');

const store = new Store({ name: 'secure_data' });

const SecureStorage = {
    set(key, value) {
        if (!safeStorage.isEncryptionAvailable()) return false;
        const encrypted = safeStorage.encryptString(value).toString('base64');
        store.set(key, encrypted);
        return true;
    },
    get(key) {
        const data = store.get(key);
        if (!data) return null;
        try {
            return safeStorage.decryptString(Buffer.from(data, 'base64'));
        } catch (e) {
            return null;
        }
    },
    delete(key) {
        store.delete(key);
    }
};

module.exports = SecureStorage;
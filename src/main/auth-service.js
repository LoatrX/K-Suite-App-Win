const SecureStorage = require('../modules/secure-storage');
const Store = require('electron-store');
const store = new Store();

class AuthService {
    async saveCredentials(email, token) {
        try {
            SecureStorage.set('auth_token', token);
            store.set('auth_email', email);
            return true;
        } catch (e) {
            console.error("Erreur de stockage sécurisé", e);
            return false;
        }
    }

    getToken() {
        return SecureStorage.get('auth_token');
    }

    logout() {
        store.delete('auth_email');
        SecureStorage.delete('auth_token');
    }
}

module.exports = new AuthService();
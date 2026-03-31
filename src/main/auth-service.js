// src/main/auth-service.js
const SecureStorage = require('../modules/secure-storage');

class AuthService {
    async saveCredentials(email, token) {
        try {
            SecureStorage.setSecure('auth_token', token);
            SecureStorage.set('auth_email', email);
            console.log("Identifiants sauvegardés avec succès.");
            return true;
        } catch (e) {
            console.error("Erreur de stockage sécurisé", e);
            return false;
        }
    }

    getToken() {
        return SecureStorage.getSecure('auth_token');
    }

    getEmail() {
        return SecureStorage.get('auth_email');
    }

    logout() {
        SecureStorage.delete('auth_email');
        SecureStorage.delete('auth_token');
        console.log("Déconnexion effectuée.");
    }
}

module.exports = new AuthService();
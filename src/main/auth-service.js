// Import du module de stockage sécurisé (CORRECT)
const SecureStorage = require('../modules/secure-storage');

class AuthService {
    // Sauvegarde le token (sécurisé) et l'email (normal)
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

    // Récupère le token
    getToken() {
        return SecureStorage.getSecure('auth_token');
    }

    // Récupère l'email
    getEmail() {
        return SecureStorage.get('auth_email');
    }

    // Déconnexion complète
    logout() {
        SecureStorage.delete('auth_email');
        SecureStorage.delete('auth_token');
        console.log("Déconnexion effectuée.");
    }
}

// Export d'une instance unique
module.exports = new AuthService();
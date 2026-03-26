/**
 * Module de communication avec les services Infomaniak
 * Permet de récupérer des informations en temps réel (Quota kDrive, Emails non lus)
 */
const { net } = require('electron');
const authService = require('./auth-service');

class InfomaniakAPI {
    constructor() {
        this.baseUrl = "https://api.infomaniak.com";
    }

    /**
     * Effectue une requête authentifiée vers l'API
     */
    async fetchAPI(endpoint, method = 'GET') {
        const token = authService.getToken();
        if (!token) return null;

        return new Promise((resolve, reject) => {
            const request = net.request({
                method: method,
                url: `${this.baseUrl}${endpoint}`,
            });

            request.setHeader('Authorization', `Bearer ${token}`);

            request.on('response', (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                });
            });

            request.on('error', (error) => { reject(error); });
            request.end();
        });
    }

    // Exemple : Récupérer l'espace kDrive utilisé
    async getDriveUsage() {
        return this.fetchAPI('/2/drive/usage');
    }

    // Exemple : Vérifier les nouveaux messages
    async getUnreadMails() {
        return this.fetchAPI('/2/mail/unread_count');
    }
}

module.exports = new InfomaniakAPI();
// API Configuration Template for LinQrius
// Copy this file to api-config.js and fill in your actual values
// DO NOT commit api-config.js to version control

const API_CONFIG = {
    // API Key name (not the secret key)
    keyName: 'YOUR_API_KEY_NAME_HERE', // e.g., 'linqrius-main'
    
    // Base URL for API calls
    baseUrl: window.location.origin,
    
    // API endpoints
    endpoints: {
        auth: {
            register: '/api/auth/register',
            login: '/api/auth/login',
            logout: '/api/auth/logout'
        },
        links: {
            create: '/api/links',
            list: '/api/links',
            delete: '/api/links'
        },
        stores: {
            create: '/api/stores',
            list: '/api/stores',
            update: '/api/stores',
            delete: '/api/stores'
        },
        analytics: {
            dashboard: '/api/analytics/dashboard',
            user: '/api/analytics/user'
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
} else {
    window.API_CONFIG = API_CONFIG;
}

console.log('🔐 API configuration template loaded');

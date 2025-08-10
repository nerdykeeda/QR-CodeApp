// LinQrius Configuration File
module.exports = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost'
    },
    
    // API Key Configuration
    apiKeys: {
        // Main application key - for regular users
        'linqrius-main': {
            key: 'sk-linqrius-2024-secure-key-12345',
            permissions: ['create-links', 'read-links', 'delete-own-links'],
            description: 'Main application API key for regular users'
        },
        
        // Admin key - for administrative operations
        'linqrius-admin': {
            key: 'sk-linqrius-admin-2024-67890',
            permissions: ['create-links', 'read-links', 'delete-any-links', 'manage-api-keys', 'view-analytics'],
            description: 'Administrative API key with full access'
        },
        
        // Test key - for development and testing
        'linqrius-test': {
            key: 'sk-linqrius-test-2024-abcde',
            permissions: ['create-links', 'read-links'],
            description: 'Testing API key for development purposes'
        }
    },
    
    // Security Configuration
    security: {
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:5000'],
            credentials: true
        }
    },
    
    // Storage Configuration
    storage: {
        type: 'in-memory', // Options: 'in-memory', 'file', 'database'
        backupInterval: 5 * 60 * 1000 // 5 minutes
    },
    
    // Logging Configuration
    logging: {
        level: 'info', // Options: 'error', 'warn', 'info', 'debug'
        enableApiKeyLogging: true,
        enableRequestLogging: true
    }
};

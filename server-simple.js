const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import services
const PaymentService = require('./payment-service');
const { requirePremium, checkPremiumFeatures } = require('./premium-middleware');
// const storeRoutes = require('./store-routes'); // temporarily disabled

// In-memory storage
const inMemoryUsers = new Map();
const inMemoryStores = new Map();
const inMemoryLinks = new Map();

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize payment service
const paymentService = new PaymentService();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// API Key authentication
const API_KEYS = {
    'linqrius-main': 'sk-linqrius-2024-secure-key-12345',
    'linqrius-admin': 'sk-linqrius-admin-2024-67890',
    'linqrius-test': 'sk-linqrius-test-2024-abcde'
};

const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    
    const keyName = Object.keys(API_KEYS).find(key => API_KEYS[key] === apiKey);
    if (!keyName) {
        return res.status(403).json({ error: 'Invalid API key' });
    }
    
    req.apiKeyInfo = { keyName, key: apiKey };
    console.log(`🔑 API request authenticated with key: ${keyName}`);
    next();
};

// In-memory storage initialized
console.log('💾 In-memory storage initialized');

// Store routes (for functional store URLs) - temporarily disabled for testing
// app.use('/', storeRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'in-memory',
        totalUsers: inMemoryUsers.size,
        totalStores: inMemoryStores.size,
        totalLinks: inMemoryLinks.size,
        apiKeyAuth: 'enabled',
        totalApiKeys: Object.keys(API_KEYS).length,
        premiumFeatures: 'enabled'
    });
});

// API Key management
app.get('/api/keys', authenticateApiKey, (req, res) => {
    if (req.apiKeyInfo.keyName !== 'linqrius-admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    res.json({
        keys: Object.keys(API_KEYS).map(key => ({
            name: key,
            permissions: key === 'linqrius-admin' ? ['all'] : ['create-links', 'read-links', 'delete-own-links']
        }))
    });
});

// User authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber, enable2FA } = req.body;
        
        // Check if user exists
        if (inMemoryUsers.has(email)) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create user
        const userId = Date.now().toString();
        const user = {
            id: userId,
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber: enable2FA ? phoneNumber : undefined,
            twoFactorEnabled: enable2FA || false,
            plan: 'free',
            createdAt: new Date()
        };
        
        inMemoryUsers.set(email, user);
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                plan: user.plan
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = inMemoryUsers.get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        
        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'linqrius-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                plan: user.plan,
                planExpiry: user.planExpiry
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Premium subscription endpoints
app.post('/api/subscription/create', authenticateApiKey, async (req, res) => {
    try {
        const { userId, plan } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Create or get Stripe customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customerResult = await paymentService.createCustomer(
                user.email, 
                user.firstName, 
                user.lastName
            );
            if (!customerResult.success) {
                return res.status(500).json({ error: 'Failed to create customer' });
            }
            customerId = customerResult.customerId;
            user.stripeCustomerId = customerId;
            await user.save();
        }
        
        // Create checkout session
        const priceId = plan === 'yearly' ? 
            process.env.STRIPE_YEARLY_PRICE_ID : 
            process.env.STRIPE_MONTHLY_PRICE_ID;
            
        const sessionResult = await paymentService.createCheckoutSession(
            customerId,
            priceId,
            `${req.protocol}://${req.get('host')}/subscription/success?userId=${userId}`,
            `${req.protocol}://${req.get('host')}/subscription/cancel`,
            { userId, plan }
        );
        
        if (!sessionResult.success) {
            return res.status(500).json({ error: 'Failed to create checkout session' });
        }
        
        res.json({
            success: true,
            checkoutUrl: sessionResult.url,
            sessionId: sessionResult.sessionId
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ error: 'Subscription creation failed', details: error.message });
    }
});

// Stripe webhook
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    try {
        await paymentService.handleWebhook(event);
        res.json({ received: true });
    } catch (error) {
        console.error('Webhook handling error:', error);
        res.status(500).json({ error: 'Webhook handling failed' });
    }
});

// Link management API (updated for database)
app.post('/api/links', authenticateApiKey, async (req, res) => {
    try {
        const { originalUrl, customAlias, userId } = req.body;
        
        if (!originalUrl || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check if custom alias is available
        if (customAlias) {
            const existingLink = await Link.findOne({ shortUrl: customAlias });
            if (existingLink) {
                return res.status(400).json({ error: 'Custom alias already taken' });
            }
        }
        
        // Generate short URL
        const shortUrl = customAlias || generateShortUrl();
        
        // Create link
        const link = new Link({
            userId,
            originalUrl,
            shortUrl,
            customAlias: customAlias || undefined
        });
        
        await link.save();
        
        console.log('Link created successfully:', link);
        res.status(201).json({
            success: true,
            link: {
                id: link._id,
                originalUrl: link.originalUrl,
                shortUrl: link.shortUrl,
                customAlias: link.customAlias,
                createdAt: link.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.get('/api/links', authenticateApiKey, async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }
        
        const links = await Link.find({ userId }).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            links: links.map(link => ({
                id: link._id,
                originalUrl: link.originalUrl,
                shortUrl: link.shortUrl,
                customAlias: link.customAlias,
                clicks: link.clicks,
                createdAt: link.createdAt
            }))
        });
    } catch (error) {
        console.error('Error fetching links:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.delete('/api/links/:id', authenticateApiKey, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }
        
        const link = await Link.findOneAndDelete({ _id: id, userId });
        
        if (!link) {
            return res.status(404).json({ error: 'Link not found or access denied' });
        }
        
        res.json({ success: true, message: 'Link deleted successfully' });
    } catch (error) {
        console.error('Error deleting link:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Redirect short URLs
app.get('/:shortUrl', async (req, res) => {
    try {
        const { shortUrl } = req.params;
        
        const link = await Link.findOne({ shortUrl });
        if (!link) {
            return res.status(404).send('Link not found');
        }
        
        // Increment click count
        link.clicks += 1;
        link.lastClicked = new Date();
        await link.save();
        
        // Redirect to original URL
        res.redirect(link.originalUrl);
    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).send('Redirect error');
    }
});

// Helper function to generate short URLs
function generateShortUrl() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Start server
app.listen(PORT, () => {
    console.log('🚀 LinQrius server starting with in-memory storage...');
    console.log('🔑 API Key authentication enabled');
    console.log('📋 Available API Keys:', Object.keys(API_KEYS).join(', '));
    console.log('🚀 LinQrius server running on http://localhost:' + PORT);
    console.log('📊 Health check: http://localhost:' + PORT + '/health');
    console.log('🔗 Link Shortener: http://localhost:' + PORT + '/link-shorten-db.html');
    console.log('💾 Storage: In-Memory (will reset on restart)');
    console.log('🔑 API request authenticated with key: linqrius-main');
});

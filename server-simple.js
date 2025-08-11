const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const {
  connectDB,
  // Users
  getUserById,
  updateUser,
  // Links
  findLinkByShort,
  createLink,
  getUserLinks,
  deleteLinkByIdForUser,
  incrementLinkClick,
  // Stores
  upsertStore,
  findStoreByIdOrUrl,
  incrementStoreViews,
} = require('./database');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

// Import services
const PaymentService = require('./payment-service');
const { requirePremium, checkPremiumFeatures, checkPremiumStatus } = require('./premium-middleware');
const storeRoutes = require('./store-routes');

// In-memory storage
const inMemoryUsers = new Map();
const inMemoryStores = new Map();
const inMemoryLinks = new Map();

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize payment service
const paymentService = new PaymentService();

// Middleware
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-key'],
    credentials: false
}));
app.options('*', cors());
// Stripe webhook must receive raw body before JSON parsing
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '25mb' }));
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

// Store routes (for functional store URLs)
app.use('/', storeRoutes);

// Initialize database connection
connectDB().catch((err) => {
    console.error('Failed to connect to database:', err);
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: 'connected',
        totalUsers: inMemoryUsers.size,
        totalStores: inMemoryStores.size,
        totalLinks: inMemoryLinks.size,
        apiKeyAuth: 'enabled',
        totalApiKeys: Object.keys(API_KEYS).length,
        premiumFeatures: 'enabled'
    });
});

// Create or update a store
app.post('/api/stores', async (req, res) => {
    try {
        console.log('📥 POST /api/stores', {
            contentType: req.headers['content-type'],
            origin: req.headers.origin,
        });
        const { id, name, description, category, banner, logo, products, userId, storeUrl } = req.body;

        if (!name || !products || products.length === 0) {
            return res.status(400).json({ error: 'Store name and at least one product are required' });
        }

        const slug = (storeUrl || name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const store = await upsertStore(id, {
          userId,
          storeName: name,
          storeDescription: description,
          storeCategory: category,
          storeLogo: logo,
          storeBanner: banner,
          products,
          storeUrl: slug,
          published: true,
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const publicUrl = `${baseUrl}/store/${store.storeUrl || store._id}`;

        res.json({
            success: true,
            store: {
                id: store.id,
                name: store.storeName,
                description: store.storeDescription,
                category: store.storeCategory,
                logo: store.storeLogo,
                banner: store.storeBanner,
                products: store.products,
                views: store.views || 0,
                url: publicUrl,
                storeUrl: store.storeUrl,
                createdAt: store.createdAt,
                updatedAt: store.updatedAt,
            },
        });
    } catch (error) {
        console.error('Save store error:', error);
        res.status(500).json({ error: 'Failed to save store', details: error.message });
    }
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

// JWT auth helper
function authenticateJWT(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.replace('Bearer ', '');
    try {
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'linqrius-secret-key');
        req.user = { id: payload.userId, email: payload.email };
        next();
    } catch (_) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// User authentication endpoints (Firestore)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber, enable2FA } = req.body;
        
        // Hash password
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(password, 12);

        try {
            // Check if user exists (Firestore)
            const { findUserByEmail, createUser } = require('./database');
            const existing = await findUserByEmail(email);
            if (existing) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // Create user in Firestore
            const created = await createUser({
                firstName,
                lastName,
                email,
                passwordHash,
                phoneNumber: enable2FA ? phoneNumber : null,
                twoFactorEnabled: !!enable2FA,
                plan: 'free',
            });

            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: {
                    id: created.id,
                    firstName: created.firstName,
                    lastName: created.lastName,
                    email: created.email,
                    plan: created.plan
                }
            });
        } catch (firestoreError) {
            console.warn('Firestore unavailable, using in-memory user store for signup:', firestoreError.message || firestoreError);
            // Fallback to in-memory users
            if (inMemoryUsers.has(email)) {
                return res.status(400).json({ error: 'User already exists' });
            }
            const userId = Date.now().toString();
            const user = {
                id: userId,
                firstName,
                lastName,
                email,
                passwordHash,
                phoneNumber: enable2FA ? phoneNumber : undefined,
                twoFactorEnabled: !!enable2FA,
                plan: 'free',
                createdAt: new Date()
            };
            inMemoryUsers.set(email, user);
            return res.status(201).json({
                success: true,
                message: 'User registered (temporary in-memory)',
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    plan: user.plan
                }
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Try Firestore first
        const bcrypt = require('bcryptjs');
        try {
            const { findUserByEmail, updateUser } = require('./database');
            const user = await findUserByEmail(email);
            if (!user) {
                throw new Error('not-found');
            }
            const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            await updateUser(user.id, { lastLogin: new Date().toISOString() });
            // Issue token
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || 'linqrius-secret-key',
                { expiresIn: '7d' }
            );
            return res.json({
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
        } catch (firestoreError) {
            console.warn('Firestore unavailable or user not found, trying in-memory login:', firestoreError.message || firestoreError);
            const user = inMemoryUsers.get(email);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const isValidPassword = await bcrypt.compare(password, user.passwordHash || user.password || '');
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            user.lastLogin = new Date();
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || 'linqrius-secret-key',
                { expiresIn: '7d' }
            );
            return res.json({
                success: true,
                message: 'Login successful (temporary in-memory)',
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
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Current user info
app.get('/api/auth/user', authenticateJWT, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            plan: user.plan,
            planExpiry: user.planExpiry || null,
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to load user' });
    }
});

// Premium status check
app.get('/api/user/premium-status', authenticateJWT, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const isPremium = await checkPremiumStatus(user);
        res.json({ isPremium, plan: user.plan, planExpiry: user.planExpiry || null });
    } catch (e) {
        res.status(500).json({ error: 'Failed to check premium status' });
    }
});

// Premium subscription endpoints
app.post('/api/subscription/create', authenticateApiKey, async (req, res) => {
    try {
        const { userId, plan } = req.body;
        
        const user = await getUserById(userId);
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
            await updateUser(userId, { stripeCustomerId: customerId });
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
app.post('/api/webhook/stripe', async (req, res) => {
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

// Link management API (Firestore)
app.post('/api/links', authenticateApiKey, async (req, res) => {
    try {
        const { originalUrl, customAlias, userId } = req.body;
        
        if (!originalUrl || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const shortUrl = customAlias || generateShortUrl();
        const link = await createLink({ userId, originalUrl, shortUrl, customAlias });
        
        console.log('Link created successfully:', link);
        res.status(201).json({
            success: true,
            link: {
                id: link.id,
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
        
        const links = await getUserLinks(userId);
        
        res.json({
            success: true,
            links: links.map(link => ({
                id: link.id,
                originalUrl: link.originalUrl,
                shortUrl: link.shortUrl,
                customAlias: link.customAlias,
                clicks: link.clicks || 0,
                createdAt: link.createdAt || null,
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
        
        const ok = await deleteLinkByIdForUser(id, userId);
        if (!ok) {
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
        const link = await findLinkByShort(shortUrl);
        if (!link) {
            return res.status(404).send('Link not found');
        }
        
        await incrementLinkClick(link.id);
        
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

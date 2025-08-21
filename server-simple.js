const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const Razorpay = require('razorpay');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Import services
const PaymentService = require('./payment-service');
const AnalyticsService = require('./analytics-service');
const CurrencyService = require('./currency-service');
const { requirePremium, checkPremiumFeatures, checkPremiumStatus } = require('./premium-middleware');
const storeRoutes = require('./store-routes');

// Supabase configuration
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://kdbwxqstkzjzwjtsjidl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYnd4cXN0a3pqendqdHNqaWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTc1MzEsImV4cCI6MjA3MDY3MzUzMX0.QvJXN03__Wzi4jptgKVapP5QvmtddSHB38y6VY2xteQ';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize services
const paymentService = new PaymentService();
const analyticsService = new AnalyticsService(supabase);
const currencyService = new CurrencyService();

// In-memory storage (keeping for backward compatibility)
const inMemoryUsers = new Map();
const inMemoryStores = new Map();
const inMemoryLinks = new Map();
const otpStorage = new Map(); // Store OTPs temporarily

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-key'],
    credentials: true
}));
app.options('*', cors());

// Cookie parser middleware
app.use(cookieParser());

// Razorpay webhook must receive raw body before JSON parsing
app.use('/api/webhook/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path) => {
        // Disable caching for HTML files to ensure consistent refresh behavior
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        // Disable caching for CSS and JS files to ensure changes show on normal refresh
        else if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        // Allow caching for other assets (images, fonts)
        else {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        }
    }
}));

// Fix routing issues - redirect non-working URLs to working ones
app.get('/link-shorten', (req, res) => {
    res.redirect('/link-shorten.html');
});

app.get('/cliqart', (req, res) => {
    res.redirect('/cliqart.html');
});

// Clear service worker and ensure clean refresh behavior
app.get('/clear-cache', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cache Cleared - LinQrius</title>
            <script>
                // Clear all caches
                if ('caches' in window) {
                    caches.keys().then(names => {
                        names.forEach(name => caches.delete(name));
                    });
                }
                // Unregister service workers
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                        registrations.forEach(registration => registration.unregister());
                    });
                }
                // Clear localStorage and sessionStorage
                localStorage.clear();
                sessionStorage.clear();
                // Redirect back to home
                setTimeout(() => window.location.href = '/', 1000);
            </script>
        </head>
        <body>
            <h1>Cache Cleared!</h1>
            <p>Redirecting to home page...</p>
        </body>
        </html>
    `);
});

// Analytics middleware - track all requests
app.use(async (req, res, next) => {
    try {
        // Track visitor session and get currency info
        const analyticsData = await analyticsService.trackVisitorSession(req, res);
        
        // Add analytics data to request object
        req.analytics = analyticsData;
        req.currency = analyticsData.currency;
        req.userLocation = analyticsData.location;
        
        // Track page view
        await analyticsService.trackPageView(
            analyticsData.sessionId,
            req.originalUrl,
            req.method === 'POST' ? 'api_call' : 'page_view'
        );
        
        next();
    } catch (error) {
        console.error('Analytics middleware error:', error);
        // Set default values on error
        req.currency = 'USD';
        req.userLocation = { country: 'US', city: 'Unknown', timezone: 'UTC' };
        next();
    }
});

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

// Initialize Supabase connection
console.log('🗄️ Testing Supabase connection...');

// Test Supabase connection by checking if tables exist
(async () => {
    try {
        // Test if links table exists
        const { data: linksTest, error: linksError } = await supabase
            .from('links')
            .select('id')
            .limit(1);
        
        if (linksError) {
            console.error('❌ Links table not accessible:', linksError.message);
            console.log('💡 Please run supabase-setup-clean.sql in your Supabase dashboard');
        } else {
            console.log('✅ Links table accessible');
        }
        
        // Test if user_links table exists
        const { data: userLinksTest, error: userLinksError } = await supabase
            .from('user_links')
            .select('id')
            .limit(1);
        
        if (userLinksError) {
            console.error('❌ User_links table not accessible:', userLinksError.message);
            console.log('💡 Please run supabase-setup-clean.sql in your Supabase dashboard');
        } else {
            console.log('✅ User_links table accessible');
        }
        
        console.log('🗄️ Supabase connection test completed');
    } catch (error) {
        console.error('❌ Supabase connection test failed:', error.message);
    }
})();

// Health check
app.get('/health', async (req, res) => {
    try {
        // Count links from Supabase database
        const { data: linksData, error: linksError } = await supabase
            .from('links')
            .select('id');
        
        if (linksError) {
            console.error('Error counting links:', linksError);
        }
        
        // Count user links from Supabase database
        const { data: userLinksData, error: userLinksError } = await supabase
            .from('user_links')
            .select('id');
        
        if (userLinksError) {
            console.error('Error counting user links:', userLinksError);
        }
        
        const totalLinks = (linksData?.length || 0) + (userLinksData?.length || 0);
        
        // Count users from Supabase
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id');
        
        if (usersError) {
            console.error('Error counting users:', usersError);
        }
        
        const totalUsers = usersData?.length || 0;
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: 'supabase-connected',
            totalUsers: totalUsers,
            totalStores: inMemoryStores.size,
            totalLinks: totalLinks,
            apiKeyAuth: 'enabled',
            totalApiKeys: Object.keys(API_KEYS).length,
            premiumFeatures: 'enabled',
            analytics: 'enabled',
            currency: req.currency || 'USD'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Health check failed' });
    }
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
        
        // Generate UUID for user if not provided
        const storeUserId = userId ? (userId.length === 36 ? userId : uuidv4()) : uuidv4();
        
        // Store in Supabase
        const { data: store, error } = await supabase
            .from('stores')
            .upsert({
                id: id || uuidv4(),
                user_id: storeUserId,
                store_name: name,
                store_description: description,
                store_category: category,
                store_logo: logo,
                store_banner: banner,
                products: products,
                store_url: slug,
                published: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase store error:', error);
            return res.status(500).json({ error: 'Failed to save store', details: error.message });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const publicUrl = `${baseUrl}/store/${store.store_url || store.id}`;

        res.json({
            success: true,
            store: {
                id: store.id,
                name: store.store_name,
                description: store.store_description,
                category: store.store_category,
                logo: store.store_logo,
                banner: store.store_banner,
                products: store.products,
                views: 0,
                url: publicUrl,
                storeUrl: store.store_url,
                createdAt: store.created_at,
                updatedAt: store.updated_at,
            },
        });
    } catch (error) {
        console.error('Save store error:', error);
        res.status(500).json({ error: 'Failed to save store', details: error.message });
    }
});

// Get stores for a user
app.get('/api/stores', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Get stores from Supabase
        const { data: stores, error } = await supabase
            .from('stores')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase get stores error:', error);
            return res.status(500).json({ error: 'Failed to get stores', details: error.message });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const formattedStores = stores.map(store => ({
            id: store.id,
            name: store.store_name,
            description: store.store_description,
            category: store.store_category,
            logo: store.store_logo,
            banner: store.store_banner,
            products: store.products,
            views: store.views || 0,
            url: `${baseUrl}/store/${store.store_url || store.id}`,
            storeUrl: store.store_url,
            createdAt: store.created_at,
            updatedAt: store.updated_at,
            published: store.published
        }));

        res.json({
            success: true,
            stores: formattedStores
        });
    } catch (error) {
        console.error('Get stores error:', error);
        res.status(500).json({ error: 'Failed to get stores', details: error.message });
    }
});

// Delete a store
app.delete('/api/stores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ error: 'Store ID is required' });
        }

        // Delete store from Supabase
        const { error } = await supabase
            .from('stores')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase delete store error:', error);
            return res.status(500).json({ error: 'Failed to delete store', details: error.message });
        }

        res.json({
            success: true,
            message: 'Store deleted successfully'
        });
    } catch (error) {
        console.error('Delete store error:', error);
        res.status(500).json({ error: 'Failed to delete store', details: error.message });
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
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'linqrius-secret-key');
        req.user = { id: payload.userId, email: payload.email };
        next();
    } catch (_) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// User authentication endpoints (In-Memory Storage)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phoneNumber, enable2FA } = req.body;
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        try {
            // Check if user exists in Supabase
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();
            
            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Supabase check error:', checkError);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // Create user in Supabase
            const userId = uuidv4();
            const { data: user, error: createError } = await supabase
                .from('users')
                .insert({
                    id: userId,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    password_hash: passwordHash,
                    phone_number: enable2FA ? phoneNumber : null,
                    two_factor_enabled: !!enable2FA,
                    plan: 'free',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (createError) {
                console.error('Supabase user creation error:', createError);
                return res.status(500).json({ error: 'Failed to create user', details: createError.message });
            }
            
            // Also store in memory for backward compatibility
            inMemoryUsers.set(email, {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                passwordHash: user.password_hash,
                phoneNumber: user.phone_number,
                twoFactorEnabled: user.two_factor_enabled,
                plan: user.plan,
                createdAt: user.created_at
            });
            
            console.log('✅ User created in Supabase:', user.email);

            return res.status(201).json({
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
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Try Supabase first, then fallback to In-Memory
        let user = null;
        
        // Check Supabase
        const { data: supabaseUser, error: supabaseError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (supabaseUser) {
            user = {
                id: supabaseUser.id,
                firstName: supabaseUser.first_name,
                lastName: supabaseUser.last_name,
                email: supabaseUser.email,
                passwordHash: supabaseUser.password_hash,
                phoneNumber: supabaseUser.phone_number,
                twoFactorEnabled: supabaseUser.two_factor_enabled,
                plan: supabaseUser.plan,
                createdAt: supabaseUser.created_at
            };
        } else if (inMemoryUsers.has(email)) {
            // Fallback to in-memory
            user = inMemoryUsers.get(email);
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        user.lastLogin = new Date();
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
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Current user info
app.get('/api/auth/user', authenticateJWT, async (req, res) => {
    try {
        const user = inMemoryUsers.get(req.user.email);
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
        const user = inMemoryUsers.get(req.user.email);
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
        
        const user = inMemoryUsers.get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Create or get Razorpay customer
        let customerId = user.razorpayCustomerId;
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
            user.razorpayCustomerId = customerId; // Update in-memory user
        }
        
        // Create checkout session
        const priceId = plan === 'yearly' ? 
            'price_yearly' : 
            'price_monthly';
            
        const sessionResult = await paymentService.createCheckoutSession(
            customerId,
            priceId,
            `${req.protocol}://${req.get('host')}/subscription/success?userId=${userId}`,
            `${req.protocol}://${req.get('host')}/subscription/cancel`,
            { userId, plan, email: user.email, firstName: user.firstName }
        );
        
        if (!sessionResult.success) {
            return res.status(500).json({ error: 'Failed to create checkout session' });
        }
        
        res.json({
            success: true,
            checkoutData: sessionResult.checkoutData,
            orderId: sessionResult.orderId,
            amount: sessionResult.amount,
            currency: sessionResult.currency
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ error: 'Subscription creation failed', details: error.message });
    }
});

// Test Razorpay integration
app.get('/api/test-razorpay', authenticateApiKey, async (req, res) => {
    try {
        const testOrder = await paymentService.createCheckoutSession(
            'test-customer-123',
            'price_monthly',
            'http://localhost:3000/success',
            'http://localhost:3000/cancel',
            { userId: 'test-123', plan: 'monthly', email: 'test@example.com', firstName: 'Test' }
        );
        
        if (testOrder.success) {
            res.json({
                success: true,
                message: 'Razorpay integration working',
                orderId: testOrder.orderId,
                amount: testOrder.amount,
                currency: testOrder.currency
            });
        } else {
            res.status(500).json({
                success: false,
                error: testOrder.error
            });
        }
    } catch (error) {
        console.error('Razorpay test error:', error);
        res.status(500).json({ error: 'Razorpay test failed' });
    }
});

// Razorpay webhook
app.post('/api/webhook/razorpay', async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your-webhook-secret';
    
    let event;
    
    try {
        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(req.body)
            .digest('hex');
        
        if (signature !== expectedSignature) {
            console.error('Webhook signature verification failed');
            return res.status(400).send('Webhook Error: Invalid signature');
        }
        
        event = JSON.parse(req.body);
    } catch (err) {
        console.error('Webhook parsing failed:', err.message);
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

// Link management API (Supabase Storage)
app.post('/api/links', authenticateApiKey, async (req, res) => {
    try {
        const { originalUrl, customAlias, userId } = req.body;
        
        if (!originalUrl) {
            return res.status(400).json({ error: 'Original URL is required' });
        }
        
        const shortUrl = customAlias || generateShortUrl();
        
        // Handle anonymous users - use the links table instead of user_links
        if (userId === 'anonymous' || !userId) {
            // Check if custom alias already exists in general links table
            if (customAlias) {
                const { data: existingLink, error: checkError } = await supabase
                    .from('links')
                    .select('id')
                    .eq('short_code', shortUrl)
                    .single();
                
                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error('Supabase check error:', checkError);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (existingLink) {
                    return res.status(400).json({ error: 'Custom alias already exists' });
                }
            }
            
            // Create link in the general links table (no user association)
            const { data: link, error } = await supabase
                .from('links')
                .insert({
                    id: uuidv4(),
                    short_code: shortUrl,
                    original_url: originalUrl,
                    display_url: originalUrl,
                    short_url: shortUrl,
                    clicks: 0,
                    created_at: new Date().toISOString(),
                    created_by: 'anonymous',
                    is_active: true
                })
                .select()
                .single();
            
            if (error) {
                console.error('Supabase anonymous link creation error:', error);
                return res.status(500).json({ error: 'Failed to create link', details: error.message });
            }
            
            console.log('Anonymous link created successfully:', link);
            res.status(201).json({
                success: true,
                originalUrl: originalUrl,
                shortUrl: shortUrl, // Just the short code, not the full URL
                id: link.id,
                clicks: 0,
                createdAt: link.created_at
            });
        } else {
            // Handle authenticated users - use user_links table
            // Check if custom alias already exists in user_links table
            if (customAlias) {
                const { data: existingLink, error: checkError } = await supabase
                    .from('user_links')
                    .select('id')
                    .eq('short_url', shortUrl)
                    .single();
                
                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error('Supabase check error:', checkError);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (existingLink) {
                    return res.status(400).json({ error: 'Custom alias already exists' });
                }
            }
            
            // Generate UUID for user if not provided
            const linkUserId = userId.length === 36 ? userId : uuidv4();
            
            // Create link in Supabase user_links table
            const { data: link, error } = await supabase
                .from('user_links')
                .insert({
                    user_id: linkUserId,
                    original_url: originalUrl,
                    short_url: shortUrl,
                    custom_alias: customAlias || null,
                    clicks: 0,
                    created_at: new Date().toISOString(),
                    last_clicked: null
                })
                .select()
                .single();
            
            if (error) {
                console.error('Supabase user link creation error:', error);
                return res.status(500).json({ error: 'Failed to create link', details: error.message });
            }
            
            console.log('User link created successfully:', link);
            res.status(201).json({
                success: true,
                originalUrl: originalUrl,
                shortUrl: shortUrl, // Just the short code, not the full URL
                id: link.id,
                clicks: 0,
                createdAt: link.created_at
            });
        }
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.get('/api/links', authenticateApiKey, async (req, res) => {
    try {
        const { userId } = req.query;
        
        // Handle anonymous users - get links from general links table
        if (userId === 'anonymous' || !userId) {
            const { data: links, error } = await supabase
                .from('links')
                .select('*')
                .eq('created_by', 'anonymous')
                .order('created_at', { ascending: false })
                .limit(50); // Limit to prevent overwhelming response
            
            if (error) {
                console.error('Supabase fetch anonymous links error:', error);
                return res.status(500).json({ error: 'Failed to fetch links', details: error.message });
            }
            
            res.json({
                success: true,
                links: links.map(link => ({
                    id: link.id,
                    originalUrl: link.original_url,
                    shortUrl: link.short_url,
                    clicks: link.clicks || 0,
                    createdAt: link.created_at || null,
                }))
            });
        } else {
            // Handle authenticated users - get links from user_links table
            const { data: links, error } = await supabase
                .from('user_links')
                .select('*')
                .eq('user_id', String(userId))
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Supabase fetch user links error:', error);
                return res.status(500).json({ error: 'Failed to fetch links', details: error.message });
            }
            
            res.json({
                success: true,
                links: links.map(link => ({
                    id: link.id,
                    originalUrl: link.original_url,
                    shortUrl: link.short_url,
                    customAlias: link.custom_alias,
                    clicks: link.clicks || 0,
                    createdAt: link.created_at || null,
                }))
            });
        }
    } catch (error) {
        console.error('Error fetching links:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.delete('/api/links/:id', authenticateApiKey, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;
        
        // Handle anonymous users (no userId required)
        if (!userId || userId === 'anonymous') {
            console.log(`🔍 Attempting to delete anonymous link: ${id}`);
            
            // First check if link exists in general links table
            let { data: link, error: checkError } = await supabase
                .from('links')
                .select('*')
                .eq('id', id)
                .single();
            
            console.log(`🔍 Links table query result:`, { link, error: checkError });
            
            // If not found in links table, check user_links table
            if (checkError || !link) {
                console.log(`🔍 Link not found in links table, checking user_links table...`);
                const { data: userLink, error: userLinkError } = await supabase
                    .from('user_links')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                console.log(`🔍 User_links table query result:`, { userLink, error: userLinkError });
                
                if (userLinkError || !userLink) {
                    console.log(`❌ Link not found in either table for ID: ${id}`);
                    return res.status(404).json({ error: 'Link not found or access denied' });
                }
                
                // Link found in user_links table, delete from there
                const { error: deleteError } = await supabase
                    .from('user_links')
                    .delete()
                    .eq('id', id);
                
                if (deleteError) {
                    console.error('Supabase delete error:', deleteError);
                    return res.status(500).json({ error: 'Failed to delete link', details: deleteError.message });
                }
                
                return res.json({ success: true, message: 'Link deleted successfully from user_links table' });
            }
            
            // Link found in links table, delete from there
            const { error: deleteError } = await supabase
                .from('links')
                .delete()
                .eq('id', id);
            
            if (deleteError) {
                console.error('Supabase delete error:', deleteError);
                return res.status(500).json({ error: 'Failed to delete link', details: deleteError.message });
            }
            
            return res.json({ success: true, message: 'Link deleted successfully from links table' });
        }
        
        // Handle authenticated users
        // Check if link exists and user has access
        const { data: link, error: checkError } = await supabase
            .from('user_links')
            .select('*')
            .eq('id', id)
            .eq('user_id', String(userId))
            .single();
        
        if (checkError || !link) {
            return res.status(404).json({ error: 'Link not found or access denied' });
        }
        
        // Delete from Supabase
        const { error: deleteError } = await supabase
            .from('user_links')
            .delete()
            .eq('id', id);
        
        if (deleteError) {
            console.error('Supabase delete error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete link', details: deleteError.message });
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
        
        // First try to find link in user_links table
        let { data: link, error } = await supabase
            .from('user_links')
            .select('*')
            .eq('short_url', shortUrl)
            .single();
        
        // If not found in user_links, try the general links table
        if (error || !link) {
            const { data: generalLink, error: generalError } = await supabase
                .from('links')
                .select('*')
                .eq('short_code', shortUrl)
                .single();
            
            if (generalError || !generalLink) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Link Not Found - LinQrius</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                            .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 15px; backdrop-filter: blur(10px); max-width: 500px; margin: 0 auto; }
                            a { color: #FFD700; text-decoration: none; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>🔗 Link Not Found</h1>
                            <p>The short link <strong>${shortUrl}</strong> doesn't exist or has expired.</p>
                            <p><a href="/">← Go to LinQrius</a></p>
                        </div>
                    </body>
                    </html>
                `);
            }
            
            link = generalLink;
        }
        
        // Update click count in the appropriate table
        if (link.user_id) {
            // Update in user_links table
            const { error: updateError } = await supabase
                .from('user_links')
                .update({ 
                    clicks: link.clicks + 1,
                    last_clicked: new Date().toISOString()
                })
                .eq('id', link.id);
            
            if (updateError) {
                console.error('Failed to update click count in user_links:', updateError);
            }
        } else {
            // Update in general links table
            const { error: updateError } = await supabase
                .from('links')
                .update({ 
                    clicks: link.clicks + 1
                })
                .eq('id', link.id);
            
            if (updateError) {
                console.error('Failed to update click count in links:', updateError);
            }
        }
        
        // Redirect to original URL
        res.redirect(link.original_url);
        
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

// OTP generation function
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expiration time (5 minutes)
const OTP_EXPIRY = 5 * 60 * 1000;

// Generate and store OTP
function createOTP(phone) {
    const otp = generateOTP();
    const expiry = Date.now() + OTP_EXPIRY;
    
    otpStorage.set(phone, {
        otp: otp,
        expiry: expiry,
        attempts: 0
    });
    
    // Auto-cleanup expired OTPs
    setTimeout(() => {
        if (otpStorage.has(phone)) {
            otpStorage.delete(phone);
        }
    }, OTP_EXPIRY);
    
    return otp;
}

// Verify OTP
function verifyOTP(phone, otp) {
    const storedOTP = otpStorage.get(phone);
    
    if (!storedOTP) {
        return { valid: false, message: 'OTP expired or not found' };
    }
    
    if (Date.now() > storedOTP.expiry) {
        otpStorage.delete(phone);
        return { valid: false, message: 'OTP expired' };
    }
    
    if (storedOTP.attempts >= 3) {
        otpStorage.delete(phone);
        return { valid: false, message: 'Too many attempts' };
    }
    
    if (storedOTP.otp === otp) {
        otpStorage.delete(phone);
        return { valid: true, message: 'OTP verified successfully' };
    } else {
        storedOTP.attempts++;
        return { valid: false, message: 'Invalid OTP' };
    }
}

// OTP endpoints
app.post('/api/auth/send-otp', authenticateApiKey, async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        
        // Generate OTP
        const otp = createOTP(phone);
        
        // TODO: Integrate with SMS service here
        // For now, just log the OTP (remove this in production!)
        console.log(`🔐 OTP for ${phone}: ${otp}`);
        
        // In production, send this OTP via SMS
        // await sendSMS(phone, `Your LinQrius OTP is: ${otp}`);
        
        res.json({ 
            success: true, 
            message: 'OTP sent successfully',
            // Remove this in production - only for testing!
            otp: otp 
        });
        
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

app.post('/api/auth/verify-otp', authenticateApiKey, async (req, res) => {
    try {
        const { phone, otp } = req.body;
        
        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone number and OTP are required' });
        }
        
        const result = verifyOTP(phone, otp);
        
        if (result.valid) {
            res.json({ 
                success: true, 
                message: result.message,
                verified: true
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: result.message,
                verified: false
            });
        }
        
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// User management endpoints
app.post('/api/auth/register', authenticateApiKey, async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone number and password are required' });
        }
        
        // Check if user already exists
        if (inMemoryUsers.has(phone)) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Create new user
        const user = {
            id: 'user_' + Date.now(),
            phone: phone,
            password: password, // In production, hash this password!
            createdAt: new Date().toISOString(),
            links: []
        };
        
        inMemoryUsers.set(phone, user);
        
        res.json({ 
            success: true, 
            message: 'User registered successfully',
            user: {
                id: user.id,
                phone: user.phone,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

app.post('/api/auth/login', authenticateApiKey, async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone number and password are required' });
        }
        
        const user = inMemoryUsers.get(phone);
        
        if (!user || user.password !== password) { // In production, use proper password comparison!
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            user: {
                id: user.id,
                phone: user.phone,
                lastLogin: user.lastLogin
            }
        });
        
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Analytics API endpoints
app.get('/api/analytics/dashboard', authenticateApiKey, async (req, res) => {
    try {
        if (req.apiKeyInfo.keyName !== 'linqrius-admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const analyticsData = await analyticsService.getAnalyticsDashboard();
        res.json({
            success: true,
            analytics: analyticsData
        });
    } catch (error) {
        console.error('Analytics dashboard error:', error);
        res.status(500).json({ error: 'Failed to get analytics', details: error.message });
    }
});

app.get('/api/analytics/user/:userId', authenticateApiKey, async (req, res) => {
    try {
        const { userId } = req.params;
        const analyticsData = await analyticsService.getUserAnalytics(userId);
        
        res.json({
            success: true,
            analytics: analyticsData
        });
    } catch (error) {
        console.error('User analytics error:', error);
        res.status(500).json({ error: 'Failed to get user analytics', details: error.message });
    }
});

// Currency API endpoints
app.get('/api/currency/pricing', async (req, res) => {
    try {
        const currency = req.currency || 'USD';
        const pricing = currencyService.getPlanPricing(currency);
        
        res.json({
            success: true,
            currency: currency,
            pricing: pricing,
            location: req.userLocation
        });
    } catch (error) {
        console.error('Currency pricing error:', error);
        res.status(500).json({ error: 'Failed to get pricing', details: error.message });
    }
});

app.get('/api/currency/supported', async (req, res) => {
    try {
        const currencies = currencyService.getSupportedCurrencies();
        
        res.json({
            success: true,
            currencies: currencies
        });
    } catch (error) {
        console.error('Supported currencies error:', error);
        res.status(500).json({ error: 'Failed to get currencies', details: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 LinQrius server starting with Supabase database...');
    console.log('🔑 API Key authentication enabled');
    console.log('📋 Available API Keys:', Object.keys(API_KEYS).join(', '));
    console.log('🚀 LinQrius server running on http://localhost:' + PORT);
    console.log('📊 Health check: http://localhost:' + PORT + '/health');
    console.log('🔗 Link Shortener: http://localhost:' + PORT + '/link-shorten-db.html');
    console.log('💾 Storage: Supabase (persistent)');
    console.log('📈 Analytics: enabled with visitor tracking');
    console.log('💱 Currency: USD/INR auto-detection');
    console.log('🔑 API request authenticated with key: linqrius-main');
});

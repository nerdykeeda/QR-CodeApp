const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linqrius';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// Link Schema
const linkSchema = new mongoose.Schema({
    shortCode: { type: String, required: true, unique: true },
    originalUrl: { type: String, required: true },
    displayUrl: { type: String, required: true },
    clicks: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'anonymous' },
    isActive: { type: Boolean, default: true }
});

const Link = mongoose.model('Link', linkSchema);

// API Routes

// Create short link
app.post('/api/links', async (req, res) => {
    try {
        const { originalUrl, customAlias } = req.body;
        
        if (!originalUrl) {
            return res.status(400).json({ error: 'Original URL is required' });
        }
        
        // Generate or use custom short code
        let shortCode = customAlias;
        if (!shortCode) {
            shortCode = generateShortCode();
            // Ensure uniqueness
            while (await Link.findOne({ shortCode })) {
                shortCode = generateShortCode();
            }
        } else {
            // Check if custom alias already exists
            const existing = await Link.findOne({ shortCode: customAlias });
            if (existing) {
                return res.status(400).json({ error: 'Custom alias already exists' });
            }
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const shortUrl = `${baseUrl}/r/${shortCode}`;
        const displayUrl = `LinQ/${shortCode}`;
        
        const link = new Link({
            shortCode,
            originalUrl,
            displayUrl,
            shortUrl
        });
        
        await link.save();
        
        res.json({
            id: link._id,
            originalUrl: link.originalUrl,
            shortUrl,
            displayUrl,
            shortCode,
            clicks: link.clicks,
            createdAt: link.createdAt
        });
        
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all links (for dashboard)
app.get('/api/links', async (req, res) => {
    try {
        const links = await Link.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(100);
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        const formattedLinks = links.map(link => ({
            id: link._id,
            originalUrl: link.originalUrl,
            shortUrl: `${baseUrl}/r/${link.shortCode}`,
            displayUrl: link.displayUrl,
            shortCode: link.shortCode,
            clicks: link.clicks,
            createdAt: link.createdAt.toLocaleDateString()
        }));
        
        res.json(formattedLinks);
    } catch (error) {
        console.error('Error fetching links:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Redirect short link
app.get('/r/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        
        const link = await Link.findOne({ 
            shortCode: shortCode.toUpperCase(), 
            isActive: true 
        });
        
        if (!link) {
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
                        <p>The short link <strong>${shortCode}</strong> doesn't exist or has expired.</p>
                        <p><a href="/">← Go to LinQrius</a></p>
                    </div>
                </body>
                </html>
            `);
        }
        
        // Update click count
        link.clicks += 1;
        await link.save();
        
        // Redirect to original URL
        res.redirect(link.originalUrl);
        
    } catch (error) {
        console.error('Error redirecting:', error);
        res.status(500).send('Internal server error');
    }
});

// Delete link
app.delete('/api/links/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await Link.findByIdAndUpdate(id, { isActive: false });
        
        res.json({ message: 'Link deleted successfully' });
    } catch (error) {
        console.error('Error deleting link:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate random short code
function generateShortCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 LinQrius server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;

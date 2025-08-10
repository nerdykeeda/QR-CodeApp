const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// In-memory storage (for testing - will reset when server restarts)
let links = [];
let nextId = 1;

console.log('🚀 LinQrius server starting with in-memory storage...');

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
            while (links.find(l => l.shortCode === shortCode)) {
                shortCode = generateShortCode();
            }
        } else {
            // Check if custom alias already exists
            const existing = links.find(l => l.shortCode === customAlias.toUpperCase());
            if (existing) {
                return res.status(400).json({ error: 'Custom alias already exists' });
            }
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const shortUrl = `${baseUrl}/r/${shortCode}`;
        const displayUrl = `LinQ/${shortCode}`;
        
        const link = {
            id: nextId++,
            shortCode: shortCode.toUpperCase(),
            originalUrl,
            displayUrl,
            shortUrl,
            clicks: 0,
            createdAt: new Date(),
            isActive: true
        };
        
        links.unshift(link);
        
        res.json({
            id: link.id,
            originalUrl: link.originalUrl,
            shortUrl,
            displayUrl,
            shortCode: link.shortCode,
            clicks: link.clicks,
            createdAt: link.createdAt.toLocaleDateString()
        });
        
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all links
app.get('/api/links', async (req, res) => {
    try {
        const activeLinks = links.filter(l => l.isActive);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        const formattedLinks = activeLinks.map(link => ({
            id: link.id,
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
        
        const link = links.find(l => 
            l.shortCode === shortCode.toUpperCase() && l.isActive
        );
        
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
        
        console.log(`📊 Redirecting ${shortCode} to ${link.originalUrl} (${link.clicks} clicks)`);
        
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
        
        const link = links.find(l => l.id === parseInt(id));
        if (link) {
            link.isActive = false;
        }
        
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
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        totalLinks: links.filter(l => l.isActive).length,
        storage: 'in-memory'
    });
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 LinQrius server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Link Shortener: http://localhost:${PORT}/link-shorten-db.html`);
    console.log(`💾 Storage: In-Memory (will reset on restart)`);
});

module.exports = app;

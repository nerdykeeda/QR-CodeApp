const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase configuration
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://kdbwxqstkzjzwjtsjidl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYnd4cXN0a3pqendqdHNqaWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTc1MzEsImV4cCI6MjA3MDY3MzUzMX0.QvJXN03__Wzi4jptgKVapP5QvmtddSHB38y6VY2xteQ';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Initialize Supabase connection
console.log('🗄️ Supabase Connected');

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
            let existing = await findLinkByShortCode(shortCode);
            while (existing) {
                shortCode = generateShortCode();
                existing = await findLinkByShortCode(shortCode);
            }
        } else {
            // Check if custom alias already exists
            const existing = await findLinkByShortCode(customAlias);
            if (existing) {
                return res.status(400).json({ error: 'Custom alias already exists' });
            }
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const shortUrl = `${baseUrl}/r/${shortCode}`;
        const displayUrl = `LinQ/${shortCode}`;
        
        // Create link in Supabase
        const { data: link, error } = await supabase
            .from('links')
            .insert({
                short_code: shortCode,
                original_url: originalUrl,
                display_url: displayUrl,
                short_url: shortUrl,
                clicks: 0,
                created_at: new Date().toISOString(),
                created_by: 'anonymous',
                is_active: true
            })
            .select()
            .single();
        
        if (error) {
            console.error('Supabase link creation error:', error);
            return res.status(500).json({ error: 'Failed to create link', details: error.message });
        }
        
        res.json({
            id: link.id,
            originalUrl: link.original_url,
            shortUrl: link.short_url,
            displayUrl: link.display_url,
            shortCode: link.short_code,
            clicks: link.clicks,
            createdAt: link.created_at
        });
        
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all links (for dashboard)
app.get('/api/links', async (req, res) => {
    try {
        const { data: links, error } = await supabase
            .from('links')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) {
            console.error('Supabase fetch links error:', error);
            return res.status(500).json({ error: 'Failed to fetch links', details: error.message });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        const formattedLinks = links.map(link => ({
            id: link.id,
            originalUrl: link.original_url,
            shortUrl: `${baseUrl}/r/${link.short_code}`,
            displayUrl: link.display_url,
            shortCode: link.short_code,
            clicks: link.clicks,
            createdAt: new Date(link.created_at).toLocaleDateString()
        }));
        
        res.json(formattedLinks);
    } catch (error) {
        console.error('Error fetching links:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Redirect short link (legacy route)
app.get('/r/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        
        const link = await findLinkByShortCode(shortCode.toUpperCase());
        
        if (!link || !link.is_active) {
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
        
        // Update click count in Supabase
        const { error: updateError } = await supabase
            .from('links')
            .update({ clicks: link.clicks + 1 })
            .eq('id', link.id);
        
        if (updateError) {
            console.error('Failed to update click count:', updateError);
        }
        
        // Redirect to original URL
        res.redirect(link.original_url);
        
    } catch (error) {
        console.error('Error redirecting:', error);
        res.status(500).send('Internal server error');
    }
});

// New redirect API endpoint for the redirect.html page
app.get('/api/links/redirect/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        
        const link = await findLinkByShortCode(shortCode.toUpperCase());
        
        if (!link || !link.is_active) {
            return res.status(404).json({ error: 'Link not found or expired' });
        }
        
        // Update click count in Supabase
        const { error: updateError } = await supabase
            .from('links')
            .update({ clicks: link.clicks + 1 })
            .eq('id', link.id);
        
        if (updateError) {
            console.error('Failed to update click count:', updateError);
        }
        
        // Return the original URL for client-side redirect
        res.json({ originalUrl: link.original_url });
        
    } catch (error) {
        console.error('Error redirecting:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete link
app.delete('/api/links/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabase
            .from('links')
            .update({ is_active: false })
            .eq('id', id);
        
        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).json({ error: 'Failed to delete link', details: error.message });
        }
        
        res.json({ message: 'Link deleted successfully' });
    } catch (error) {
        console.error('Error deleting link:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to find link by short code
async function findLinkByShortCode(shortCode) {
    const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('short_code', shortCode)
        .single();
    
    if (error) return null;
    return data;
}

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
        database: 'supabase-connected'
    });
});

// Canonical URL redirects
app.get('/index.html', (req, res) => {
    res.redirect(301, '/');
});

app.get('/link-shorten.html', (req, res) => {
    res.redirect(301, '/link-shorten');
});

app.get('/cliqart.html', (req, res) => {
    res.redirect(301, '/cliqart');
});

// Serve pages without .html extension
app.get('/link-shorten', (req, res) => {
    res.sendFile(path.join(__dirname, 'link-shorten.html'));
});

app.get('/cliqart', (req, res) => {
    res.sendFile(path.join(__dirname, 'cliqart.html'));
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle old URLs with redirects
app.get('/vcard-generator-fixed.html', (req, res) => {
    res.redirect(301, '/');
});

app.get('/vcard-qr-generator-complete.html', (req, res) => {
    res.redirect(301, '/');
});

app.get('/simple-redirect.html', (req, res) => {
    res.redirect(301, '/');
});

app.get('/test-shortener.html', (req, res) => {
    res.redirect(301, '/link-shorten');
});

// Serve sitemap
app.get('/sitemap.xml', (req, res) => {
    res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Serve robots.txt
app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.listen(PORT, () => {
    console.log(`🚀 LinQrius server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;

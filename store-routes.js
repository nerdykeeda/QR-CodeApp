const express = require('express');
const { findStoreByIdOrUrl, incrementStoreViews } = require('./database');
const { checkPremiumFeatures } = require('./premium-middleware');

const router = express.Router();

// View a store by URL
router.get('/store/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        
        const store = await findStoreByIdOrUrl(storeId);

        if (!store) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Store Not Found</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #e74c3c; }
                        .home-link { color: #3498db; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Store Not Found</h1>
                    <p>The store you're looking for doesn't exist or has been removed.</p>
                    <a href="/" class="home-link">Go to LinQrius Home</a>
                </body>
                </html>
            `);
        }

        await incrementStoreViews(store.id);

        // Generate store HTML
        const storeHTML = generateStoreHTML(store);
        
        res.send(storeHTML);
    } catch (error) {
        console.error('Error viewing store:', error);
        res.status(500).send('Error loading store');
    }
});

// API endpoint to get store data
router.get('/api/store/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        
        const store = await findStoreByIdOrUrl(storeId);

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // Remove sensitive information
        const storeData = {
            id: store.id,
            storeName: store.storeName,
            storeDescription: store.storeDescription,
            storeCategory: store.storeCategory,
            storeLogo: store.storeLogo,
            storeBanner: store.storeBanner,
            products: store.products,
            storeUrl: store.storeUrl,
            qrCode: store.qrCode,
            published: store.published,
            createdAt: store.createdAt,
            views: store.views || 0
        };

        res.json(storeData);
    } catch (error) {
        console.error('Error getting store data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate store HTML
function generateStoreHTML(store) {
    const productsHTML = store.products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image || '/icons/icon-192x192.png'}" alt="${product.name}" onerror="this.src='/icons/icon-192x192.png'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                ${product.price ? `<p class="product-price">$${product.price}</p>` : ''}
                <a href="${product.url}" target="_blank" class="product-link">View Product</a>
            </div>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${store.storeName} - LinQrius Store</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.svg">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .store-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
                .store-logo { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: block; object-fit: cover; }
                .store-name { font-size: 2.5rem; margin-bottom: 10px; font-weight: 300; }
                .store-description { font-size: 1.1rem; opacity: 0.9; margin-bottom: 20px; }
                .store-category { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; }
                .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                .products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 40px; }
                .product-card { background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden; transition: transform 0.3s ease; }
                .product-card:hover { transform: translateY(-5px); }
                .product-image { height: 200px; overflow: hidden; }
                .product-image img { width: 100%; height: 100%; object-fit: cover; }
                .product-info { padding: 25px; }
                .product-name { font-size: 1.3rem; margin-bottom: 10px; color: #2c3e50; }
                .product-description { color: #7f8c8d; margin-bottom: 15px; line-height: 1.5; }
                .product-price { font-size: 1.2rem; font-weight: bold; color: #27ae60; margin-bottom: 15px; }
                .product-link { display: inline-block; background: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; transition: background 0.3s ease; }
                .product-link:hover { background: #2980b9; }
                .store-footer { background: #f8f9fa; text-align: center; padding: 30px; margin-top: 50px; color: #6c757d; }
                .powered-by { color: #667eea; text-decoration: none; font-weight: bold; }
                .no-products { text-align: center; padding: 60px 20px; color: #6c757d; }
                .no-products i { font-size: 4rem; margin-bottom: 20px; opacity: 0.5; }
                @media (max-width: 768px) { .store-name { font-size: 2rem; } .products-grid { grid-template-columns: 1fr; } }
            </style>
        </head>
        <body>
            <header class="store-header">
                ${store.storeLogo ? `<img src="${store.storeLogo}" alt="${store.storeName}" class="store-logo">` : ''}
                <h1 class="store-name">${store.storeName}</h1>
                ${store.storeDescription ? `<p class="store-description">${store.storeDescription}</p>` : ''}
                ${store.storeCategory ? `<span class="store-category">${store.storeCategory}</span>` : ''}
            </header>

            <div class="container">
                ${store.products.length > 0 ? 
                    `<div class="products-grid">${productsHTML}</div>` : 
                    `<div class="no-products">
                        <i>🛍️</i>
                        <h2>No Products Yet</h2>
                        <p>This store doesn't have any products listed yet.</p>
                    </div>`
                }
            </div>

            <footer class="store-footer">
                <p>Powered by <a href="/" class="powered-by">LinQrius</a> - Create your own store in minutes!</p>
            </footer>
        </body>
        </html>
    `;
}

module.exports = router;

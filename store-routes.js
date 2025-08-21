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
                <img src="${product.image || '/icons/icon-192x192.png'}" alt="${product.name || 'Product'}" onerror="this.src='/icons/icon-192x192.png'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name || 'Product Name'}</h3>
                <p class="product-description">${product.description || 'Product description'}</p>
                ${product.price ? `<p class="product-price">$${product.price}</p>` : '<p class="product-price">Price not set</p>'}
                <a href="${product.url}" target="_blank" class="product-link">Shop Now</a>
            </div>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${store.store_name || 'Store'} - LinQrius</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.svg">
            <link rel="stylesheet" href="/store-styles.css">
            

            

            

            

            

            

            

            

        </head>
        <body>
            <header class="store-header">
                <!-- Banner Image -->
                <div class="banner-image">
                    ${store.store_banner ? `<img src="${store.store_banner}" alt="Store Banner">` : ''}
                    <div class="banner-overlay"></div>
                </div>
                
                <!-- Profile Section -->
                <div class="profile-section">
                    ${store.store_logo ? `<img src="${store.store_logo}" alt="${store.store_name || 'Store'}" class="store-logo">` : ''}
                    
                    <div class="store-info">
                        ${store.store_name ? `<h1 class="store-name">${store.store_name}</h1>` : ''}
                        ${store.store_description ? `<p class="store-description">${store.store_description}</p>` : ''}
                        ${store.store_category ? `<span class="store-category">${store.store_category}</span>` : ''}
                    </div>
                </div>
            </header>

            <!-- Category Navigation -->
            <nav class="category-nav">
                <div class="container">
                    <ul class="category-tabs">
                        <li class="category-tab active">All Products</li>
                        ${store.store_category ? `<li class="category-tab">${store.store_category}</li>` : ''}
                        <li class="category-tab">New Arrivals</li>
                        <li class="category-tab">Best Sellers</li>
                    </ul>
                </div>
            </nav>

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

// Dashboard JavaScript
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.stores = [];
        this.links = [];
        this.initializeDashboard();
    }

    initializeDashboard() {
        // Check if user is logged in
        const savedUser = localStorage.getItem('linqrius_user') || sessionStorage.getItem('linqrius_user');
        if (!savedUser) {
            // Redirect to home if not logged in
            window.location.href = 'index.html';
            return;
        }

        this.currentUser = JSON.parse(savedUser);
        document.getElementById('userName').textContent = this.currentUser.firstName;

        this.loadData();
        this.updateStats();
        this.initializeEventListeners();
    }

    loadData() {
        // Load stores
        const allStores = JSON.parse(localStorage.getItem('cliqart_stores') || '[]');
        this.stores = allStores.filter(store => store.userId === this.currentUser.id);

        // Load links
        const allLinks = JSON.parse(localStorage.getItem('linqrius_links') || '[]');
        this.links = allLinks.filter(link => link.userId === this.currentUser.id);

        this.renderStores();
        this.renderLinks();
        this.renderAnalytics();
    }

    updateStats() {
        // Update stat cards
        document.getElementById('storeCount').textContent = this.stores.length;
        document.getElementById('linkCount').textContent = this.links.length;
        
        // Calculate total views
        const totalViews = this.links.reduce((total, link) => total + (link.clicks || 0), 0);
        document.getElementById('totalViews').textContent = totalViews;
        document.getElementById('monthlyViews').textContent = totalViews;

        // VCard count (placeholder - in real app this would be tracked)
        document.getElementById('vcardCount').textContent = '0';
    }

    renderStores() {
        const container = document.getElementById('storesList');
        
        if (this.stores.length === 0) {
            container.innerHTML = `
                <div class="empty-dashboard-state">
                    <i class="fas fa-store"></i>
                    <h3>No Stores Yet</h3>
                    <p>Create your first LinQart store to start selling online</p>
                    <a href="cliqart.html" class="primary-btn">
                        <i class="fas fa-plus"></i> Create Your First Store
                    </a>
                </div>
            `;
            return;
        }

        const storesHTML = this.stores.map(store => `
            <div class="dashboard-card store-card">
                <div class="card-header">
                    ${store.banner ? `<img src="${store.banner}" alt="Store Banner" class="store-banner-thumb">` : '<div class="store-banner-placeholder"><i class="fas fa-image"></i></div>'}
                    <div class="store-info">
                        ${store.logo ? `<img src="${store.logo}" alt="Store Logo" class="store-logo-thumb">` : '<div class="store-logo-placeholder"><i class="fas fa-store"></i></div>'}
                        <div>
                            <h3>${store.name}</h3>
                            <p>${store.description || 'No description'}</p>
                        </div>
                    </div>
                </div>
                <div class="card-stats">
                    <div class="stat">
                        <span class="stat-number">${store.products.length}</span>
                        <span class="stat-label">Products</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${store.views || 0}</span>
                        <span class="stat-label">Views</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${store.clicks || 0}</span>
                        <span class="stat-label">Clicks</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button onclick="dashboard.viewStore('${store.id}')" class="action-btn">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button onclick="dashboard.editStore('${store.id}')" class="action-btn">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="dashboard.shareStore('${store.id}')" class="action-btn">
                        <i class="fas fa-share"></i> Share
                    </button>
                    <button onclick="dashboard.deleteStore('${store.id}')" class="action-btn danger">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
                <div class="card-footer">
                    <span class="creation-date">Created: ${new Date(store.createdAt).toLocaleDateString()}</span>
                    <span class="store-status ${store.published ? 'published' : 'draft'}">
                        ${store.published ? 'Published' : 'Draft'}
                    </span>
                </div>
            </div>
        `).join('');

        container.innerHTML = storesHTML;
    }

    renderLinks() {
        const container = document.getElementById('linksList');
        
        if (this.links.length === 0) {
            container.innerHTML = `
                <div class="empty-dashboard-state">
                    <i class="fas fa-link"></i>
                    <h3>No Links Yet</h3>
                    <p>Create your first shortened link to start tracking clicks</p>
                    <a href="link-shorten.html" class="primary-btn">
                        <i class="fas fa-plus"></i> Create Your First Link
                    </a>
                </div>
            `;
            return;
        }

        const linksHTML = `
            <div class="table-container">
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>Short Link</th>
                            <th>Original URL</th>
                            <th>Clicks</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.links.map(link => `
                            <tr>
                                <td>
                                    <div class="link-cell">
                                        <code class="short-link">${link.shortUrl}</code>
                                        <button onclick="dashboard.copyLink('${link.shortUrl}')" class="copy-link-btn">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <div class="original-url" title="${link.originalUrl}">
                                        ${this.truncateUrl(link.originalUrl, 50)}
                                    </div>
                                </td>
                                <td>
                                    <span class="click-count">${link.clicks || 0}</span>
                                </td>
                                <td>
                                    <span class="creation-date">${new Date(link.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td>
                                    <div class="table-actions">
                                        <button onclick="dashboard.generateLinkQR('${link.shortUrl}')" class="table-action-btn">
                                            <i class="fas fa-qrcode"></i>
                                        </button>
                                        <button onclick="dashboard.deleteLink('${link.id}')" class="table-action-btn danger">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = linksHTML;
    }

    renderAnalytics() {
        // Render recent activity
        const activities = this.generateRecentActivity();
        const activityContainer = document.getElementById('recentActivity');
        
        if (activities.length === 0) {
            activityContainer.innerHTML = `
                <div class="no-activity">
                    <i class="fas fa-chart-line"></i>
                    <p>No recent activity to display</p>
                </div>
            `;
            return;
        }

        const activitiesHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');

        activityContainer.innerHTML = activitiesHTML;
    }

    generateRecentActivity() {
        const activities = [];
        
        // Add store activities
        this.stores.forEach(store => {
            activities.push({
                type: 'store',
                icon: 'fa-store',
                title: 'Store Created',
                description: `Created store "${store.name}"`,
                time: this.timeAgo(new Date(store.createdAt))
            });
        });

        // Add link activities
        this.links.forEach(link => {
            activities.push({
                type: 'link',
                icon: 'fa-link',
                title: 'Link Shortened',
                description: `Created short link ${link.shortUrl}`,
                time: this.timeAgo(new Date(link.createdAt))
            });
        });

        // Sort by date and return last 10
        return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
    }

    initializeEventListeners() {
        // Modal close functionality
        const modals = document.querySelectorAll('.modal');
        const closeButtons = document.querySelectorAll('.close');

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modals.forEach(modal => modal.style.display = 'none');
            });
        });

        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    // Store actions
    viewStore(storeId) {
        const store = this.stores.find(s => s.id === storeId);
        if (!store) return;

        // Create and open preview window
        const previewWindow = window.open('', '_blank');
        const previewHTML = this.generateStoreHTML(store);
        previewWindow.document.write(previewHTML);
        previewWindow.document.close();
    }

    editStore(storeId) {
        // Redirect to LinQart with store ID for editing
        window.location.href = `cliqart.html?edit=${storeId}`;
    }

    shareStore(storeId) {
        const store = this.stores.find(s => s.id === storeId);
        if (!store) return;

        const shareUrl = store.url || `https://linqrius.com/store/${storeId}`;
        
        if (navigator.share) {
            navigator.share({
                title: store.name,
                text: store.description,
                url: shareUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                showNotification('Store URL copied to clipboard!', 'success');
            });
        }
    }

    deleteStore(storeId) {
        if (confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
            // Remove from stores array
            this.stores = this.stores.filter(s => s.id !== storeId);
            
            // Update localStorage
            const allStores = JSON.parse(localStorage.getItem('cliqart_stores') || '[]');
            const updatedStores = allStores.filter(s => s.id !== storeId);
            localStorage.setItem('cliqart_stores', JSON.stringify(updatedStores));
            
            // Re-render
            this.renderStores();
            this.updateStats();
            showNotification('Store deleted successfully!', 'success');
        }
    }

    // Link actions
    copyLink(shortUrl) {
        navigator.clipboard.writeText(shortUrl).then(() => {
            showNotification('Link copied to clipboard!', 'success');
        });
    }

    generateLinkQR(shortUrl) {
        if (typeof QRCode === 'undefined') {
            showNotification('QR Code library not loaded', 'error');
            return;
        }

        QRCode.toDataURL(shortUrl, {
            errorCorrectionLevel: 'H',
            width: 256,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        }).then(dataUrl => {
            // Create modal to show QR code
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                    <h3>QR Code for ${shortUrl}</h3>
                    <div style="text-align: center; margin: 20px 0;">
                        <img src="${dataUrl}" alt="QR Code" style="max-width: 100%; border-radius: 10px;">
                    </div>
                    <div style="text-align: center;">
                        <button onclick="dashboard.downloadQR('${dataUrl}', '${shortUrl}')" class="primary-btn">
                            <i class="fas fa-download"></i> Download QR Code
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }).catch(error => {
            console.error('QR generation error:', error);
            showNotification('Failed to generate QR code', 'error');
        });
    }

    downloadQR(dataUrl, shortUrl) {
        const link = document.createElement('a');
        link.download = `qr-${shortUrl.replace(/[^a-zA-Z0-9]/g, '')}.png`;
        link.href = dataUrl;
        link.click();
    }

    deleteLink(linkId) {
        if (confirm('Are you sure you want to delete this link?')) {
            // Remove from links array
            this.links = this.links.filter(l => l.id !== linkId);
            
            // Update localStorage
            const allLinks = JSON.parse(localStorage.getItem('linqrius_links') || '[]');
            const updatedLinks = allLinks.filter(l => l.id !== linkId);
            localStorage.setItem('linqrius_links', JSON.stringify(updatedLinks));
            
            // Re-render
            this.renderLinks();
            this.updateStats();
            showNotification('Link deleted successfully!', 'success');
        }
    }

    // Helper methods
    generateStoreHTML(store) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${store.name} - Powered by LinQrius</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
                    .store-container { max-width: 1200px; margin: 0 auto; background: white; }
                    .store-banner { width: 100%; height: 300px; object-fit: cover; }
                    .store-header { padding: 20px; display: flex; align-items: center; gap: 20px; }
                    .store-logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
                    .store-info h1 { margin: 0; color: #333; }
                    .store-info p { color: #666; }
                    .category-badge { background: #667eea; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.8rem; }
                    .products-section { padding: 20px; }
                    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
                    .product-card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .product-image { width: 100%; height: 200px; object-fit: cover; }
                    .product-info { padding: 15px; }
                    .product-info h3 { margin: 0 0 10px 0; color: #333; }
                    .product-price { color: #667eea; font-weight: bold; font-size: 1.1rem; }
                    .shop-btn { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%; margin-top: 10px; }
                    .footer { text-align: center; padding: 20px; background: #f0f0f0; color: #666; font-size: 0.9rem; }
                </style>
            </head>
            <body>
                <div class="store-container">
                    ${store.banner ? `<img src="${store.banner}" alt="Store Banner" class="store-banner">` : ''}
                    
                    <div class="store-header">
                        ${store.logo ? `<img src="${store.logo}" alt="Store Logo" class="store-logo">` : ''}
                        <div class="store-info">
                            <h1>${store.name}</h1>
                            ${store.description ? `<p>${store.description}</p>` : ''}
                            ${store.category ? `<span class="category-badge">${this.getCategoryLabel(store.category)}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="products-section">
                        <h2>Our Products (${store.products.length})</h2>
                        <div class="products-grid">
                            ${store.products.map(product => `
                                <div class="product-card">
                                    ${product.image ? `<img src="${product.image}" alt="${product.name}" class="product-image">` : '<div style="height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;"><i class="fas fa-image"></i></div>'}
                                    <div class="product-info">
                                        <h3>${product.name}</h3>
                                        ${product.price ? `<div class="product-price">${product.price}</div>` : ''}
                                        ${product.description ? `<p style="color: #666; font-size: 0.9rem;">${product.description}</p>` : ''}
                                        <button class="shop-btn" onclick="window.open('${product.url}', '_blank')">Shop Now</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Powered by <strong>LinQrius LinQart</strong> - Create your own store at <a href="https://linqrius.com" target="_blank">linqrius.com</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getCategoryLabel(category) {
        const categories = {
            'fashion': 'Fashion & Clothing',
            'electronics': 'Electronics',
            'home-garden': 'Home & Garden',
            'health-beauty': 'Health & Beauty',
            'sports': 'Sports & Outdoors',
            'books': 'Books & Media',
            'food-beverage': 'Food & Beverage',
            'handmade': 'Handmade & Crafts',
            'services': 'Services',
            'other': 'Other'
        };
        return categories[category] || category;
    }

    truncateUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }

    timeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
}

// Tab switching
function switchDashTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.dash-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.dash-tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// User dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

// Logout
function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    }
    window.location.href = 'index.html';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-dropdown')) {
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) dropdown.style.display = 'none';
        }
    });
});

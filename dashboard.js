// LinQrius Dashboard - Comprehensive Analytics & Management
class LinQriusDashboard {
    constructor() {
        this.currentUser = null;
        this.stats = {
            totalStores: 0,
            totalProducts: 0,
            totalLinks: 0,
            totalViews: 0,
            monthlyGrowth: 0
        };
        this.initializeDashboard();
    }

    async initializeDashboard() {
        this.currentUser = this.getCurrentUser();
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        await this.loadUserData();
        this.setupEventListeners();
        this.updateDashboard();
        this.initializeCharts();
    }

    getCurrentUser() {
        const savedUser = localStorage.getItem('linqrius_user') || sessionStorage.getItem('linqrius_user');
        return savedUser ? JSON.parse(savedUser) : null;
    }

    async loadUserData() {
        // First try to load from Supabase (new functionality)
        await this.loadSupabaseData();
        
        // Then load from localStorage (existing logic - untouched)
        const allStores = JSON.parse(localStorage.getItem('linqrius_stores') || '[]');
        this.userStores = this.userStores.concat(allStores.filter(store => store.userId === this.currentUser.id));
        
        const allLinks = JSON.parse(localStorage.getItem('linqrius_shortened_links') || '[]');
        this.userLinks = this.userLinks.concat(allLinks.filter(link => link.userId === this.currentUser.id));
        
        // Calculate stats (existing logic - untouched)
        this.calculateStats();
    }

    async loadSupabaseData() {
        try {
            // Initialize Supabase client using the global supabase instance
            const supabase = window.supabase;
            
            // Get current user from Supabase auth
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                console.log('No Supabase user found, using localStorage only');
                this.userStores = [];
                this.userLinks = [];
                return;
            }

            // Fetch stores from Supabase (existing logic preserved)
            const { data: stores, error: storesError } = await supabase
                .from('stores')
                .select('*')
                .eq('user_id', user.id);

            if (storesError) {
                console.error('Error fetching stores:', storesError);
                this.userStores = [];
            } else {
                this.userStores = stores || [];
                console.log('Loaded stores from Supabase:', this.userStores.length);
            }

            // Fetch links from Supabase (existing logic preserved)
            const { data: links, error: linksError } = await supabase
                .from('user_links')
                .select('*')
                .eq('user_id', user.id);

            if (linksError) {
                console.error('Error fetching links:', linksError);
                this.userLinks = [];
            } else {
                this.userLinks = links || [];
                console.log('Loaded links from Supabase:', this.userLinks.length);
            }

        } catch (error) {
            console.error('Error loading Supabase data:', error);
            this.userStores = [];
            this.userLinks = [];
        }
    }

    calculateStats() {
        this.stats.totalStores = this.userStores.length;
        this.stats.totalProducts = this.userStores.reduce((total, store) => total + (store.products?.length || 0), 0);
        this.stats.totalLinks = this.userLinks.length;
        this.stats.totalViews = this.userStores.reduce((total, store) => total + (store.views || 0), 0) + 
                                this.userLinks.reduce((total, link) => total + (link.views || 0), 0);
        
        // Calculate monthly growth (simulated)
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        this.stats.monthlyGrowth = Math.floor(Math.random() * 25) + 5; // 5-30% growth
    }

    setupEventListeners() {
        // Quick action buttons
        const createStoreBtn = document.getElementById('createStoreBtn');
        if (createStoreBtn) {
            createStoreBtn.addEventListener('click', () => {
                window.location.href = 'cliqart.html';
            });
        }

        const createLinkBtn = document.getElementById('createLinkBtn');
        if (createLinkBtn) {
            createLinkBtn.addEventListener('click', () => {
                window.location.href = 'link-shorten.html';
            });
        }

        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });

        // Store actions
        this.setupStoreActions();
    }

    setupStoreActions() {
        // Edit store buttons
        document.querySelectorAll('.edit-store-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const storeId = e.target.dataset.storeId;
                this.editStore(storeId);
            });
        });

        // Delete store buttons
        document.querySelectorAll('.delete-store-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const storeId = e.target.dataset.storeId;
                this.deleteStore(storeId);
            });
        });

        // View store buttons
        document.querySelectorAll('.view-store-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const storeId = e.target.dataset.storeId;
                this.viewStore(storeId);
            });
        });
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab content
        const selectedTab = document.getElementById(`${tabName}Tab`);
        if (selectedTab) {
            selectedTab.style.display = 'block';
        }

        // Add active class to selected tab button
        const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        // Update content based on tab
        switch (tabName) {
            case 'stores':
                this.renderStoresTab();
                break;
            case 'links':
                this.renderLinksTab();
                break;
            case 'analytics':
                this.renderAnalyticsTab();
                break;
        }
    }

    updateDashboard() {
        this.updateStats();
        this.renderStoresTab();
        this.renderLinksTab();
        this.renderAnalyticsTab();
    }

    updateStats() {
        // Update stats display
        const statsElements = {
            totalStores: document.getElementById('storeCount'),
            totalProducts: document.getElementById('vcardCount'),
            totalLinks: document.getElementById('linkCount'),
            totalViews: document.getElementById('totalViews'),
            monthlyGrowth: document.getElementById('monthlyGrowth')
        };

        Object.keys(statsElements).forEach(key => {
            if (statsElements[key]) {
                if (key === 'monthlyGrowth') {
                    statsElements[key].textContent = `+${this.stats[key]}%`;
                    statsElements[key].className = this.stats[key] > 0 ? 'positive' : 'negative';
                } else {
                    statsElements[key].textContent = this.stats[key].toLocaleString();
                }
            }
        });
    }

    renderStoresTab() {
        const storesContainer = document.getElementById('storesList');
        if (!storesContainer) return;

        if (this.userStores.length === 0) {
            storesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-store"></i>
                    <h3>No Stores Created Yet</h3>
                    <p>Create your first LinQart store to start selling online</p>
                    <button class="btn btn-primary" onclick="window.location.href='cliqart.html'">
                        <i class="fas fa-plus"></i> Create Your First Store
                    </button>
                </div>
            `;
            return;
        }

        storesContainer.innerHTML = this.userStores.map(store => `
            <div class="store-card">
                <div class="store-header">
                    <h4>${store.name}</h4>
                    <div class="store-actions">
                        <button class="btn btn-sm btn-secondary edit-store-btn" data-store-id="${store.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger delete-store-btn" data-store-id="${store.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="store-info">
                    <p><strong>Products:</strong> ${store.products?.length || 0}</p>
                    <p><strong>Views:</strong> ${store.views || 0}</p>
                    <p><strong>Created:</strong> ${new Date(store.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="store-links">
                    <button class="btn btn-sm btn-primary view-store-btn" data-store-id="${store.id}">
                        <i class="fas fa-external-link-alt"></i> View Store
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="copyToClipboard('${store.storeLink}')">
                        <i class="fas fa-copy"></i> Copy Link
                    </button>
                </div>
            </div>
        `).join('');

        this.setupStoreActions();
    }

    renderLinksTab() {
        const linksContainer = document.getElementById('linksList');
        if (!linksContainer) return;

        if (this.userLinks.length === 0) {
            linksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-link"></i>
                    <h3>No Shortened Links</h3>
                    <p>Create your first shortened link to track clicks and analytics</p>
                    <button class="btn btn-primary" onclick="window.location.href='link-shorten.html'">
                        <i class="fas fa-plus"></i> Create Short Link
                    </button>
                </div>
            `;
            return;
        }

        linksContainer.innerHTML = this.userLinks.map(link => `
            <div class="link-card">
                <div class="link-header">
                    <h4>${link.originalUrl.substring(0, 50)}${link.originalUrl.length > 50 ? '...' : ''}</h4>
                    <div class="link-actions">
                        <button class="btn btn-sm btn-secondary" onclick="copyToClipboard('${link.shortUrl}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteLink('${link.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="link-info">
                    <p><strong>Short URL:</strong> <a href="${link.shortUrl}" target="_blank">${link.shortUrl}</a></p>
                    <p><strong>Clicks:</strong> ${link.clicks || 0}</p>
                    <p><strong>Created:</strong> ${new Date(link.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('');
    }

    renderAnalyticsTab() {
        const analyticsContainer = document.getElementById('analyticsContent');
        if (!analyticsContainer) return;

        // Generate sample analytics data
        const monthlyData = this.generateMonthlyData();
        
        analyticsContainer.innerHTML = `
            <div class="analytics-grid">
                <div class="chart-container">
                    <h4>Monthly Growth</h4>
                    <div class="chart" id="growthChart">
                        ${this.renderGrowthChart(monthlyData)}
                    </div>
                </div>
                <div class="chart-container">
                    <h4>Store Performance</h4>
                    <div class="chart" id="storeChart">
                        ${this.renderStoreChart()}
                    </div>
                </div>
                <div class="chart-container">
                    <h4>Link Performance</h4>
                    <div class="chart" id="linkChart">
                        ${this.renderLinkChart()}
                    </div>
                </div>
            </div>
        `;
    }

    generateMonthlyData() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map(month => ({
            month,
            stores: Math.floor(Math.random() * 10) + 1,
            products: Math.floor(Math.random() * 50) + 10,
            views: Math.floor(Math.random() * 1000) + 100
        }));
    }

    renderGrowthChart(data) {
        const maxValue = Math.max(...data.map(d => d.stores + d.products + d.views));
        return data.map(item => {
            const height = ((item.stores + item.products + item.views) / maxValue) * 100;
            return `
                <div class="chart-bar">
                    <div class="bar" style="height: ${height}%"></div>
                    <span class="bar-label">${item.month}</span>
                </div>
            `;
        }).join('');
    }

    renderStoreChart() {
        if (this.userStores.length === 0) {
            return '<p class="no-data">No stores to display</p>';
        }

        const storeData = this.userStores.map(store => ({
            name: store.name,
            products: store.products?.length || 0,
            views: store.views || 0
        }));

        return storeData.map(store => `
            <div class="store-bar">
                <div class="store-name">${store.name}</div>
                <div class="store-metrics">
                    <span class="metric">${store.products} products</span>
                    <span class="metric">${store.views} views</span>
                </div>
            </div>
        `).join('');
    }

    renderLinkChart() {
        if (this.userLinks.length === 0) {
            return '<p class="no-data">No links to display</p>';
        }

        const linkData = this.userLinks.slice(0, 5).map(link => ({
            url: link.originalUrl.substring(0, 30) + '...',
            clicks: link.clicks || 0
        }));

        return linkData.map(link => `
            <div class="link-bar">
                <div class="link-url">${link.url}</div>
                <div class="link-clicks">${link.clicks} clicks</div>
            </div>
        `).join('');
    }

    editStore(storeId) {
        // Store the store ID in localStorage for editing
        localStorage.setItem('editing_store_id', storeId);
        window.location.href = 'cliqart.html';
    }

    deleteStore(storeId) {
        if (confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
            // Remove store from localStorage
            const allStores = JSON.parse(localStorage.getItem('linqrius_stores') || '[]');
            const updatedStores = allStores.filter(store => store.id !== storeId);
            localStorage.setItem('linqrius_stores', JSON.stringify(updatedStores));
            
            // Reload dashboard
            this.loadUserData();
            this.updateDashboard();
            showNotification('Store deleted successfully', 'success');
        }
    }

    viewStore(storeId) {
        const store = this.userStores.find(s => s.id === storeId);
        if (store && store.storeLink) {
            window.open(store.storeLink, '_blank');
        }
    }

    initializeCharts() {
        // Add any additional chart libraries here if needed
        // For now, we're using CSS-based charts
    }
}

// Global functions
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy to clipboard', 'error');
    });
}

function deleteLink(linkId) {
    if (confirm('Are you sure you want to delete this link?')) {
        const allLinks = JSON.parse(localStorage.getItem('linqrius_shortened_links') || '[]');
        const updatedLinks = allLinks.filter(link => link.id !== linkId);
        localStorage.setItem('linqrius_shortened_links', JSON.stringify(updatedLinks));
        
        // Reload dashboard
        if (window.dashboard) {
            window.dashboard.loadUserData();
            window.dashboard.updateDashboard();
        }
        showNotification('Link deleted successfully', 'success');
    }
}

function showNotification(message, type = 'success') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new LinQriusDashboard();
});

// Global tab switching function (for HTML onclick handlers)
function switchDashTab(tabName) {
    if (window.dashboard) {
        window.dashboard.switchTab(tabName);
    }
}

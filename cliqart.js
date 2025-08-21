// LinQart Web Store Creator
class LinQart {
    constructor() {
        this.stores = [];
        this.currentStore = {
            id: null,
            name: '',
            description: '',
            category: '',
            banner: '',
            logo: '',
            products: [],
            createdAt: null,
            url: ''
        };
        this.initializeEventListeners();
        this.initializeImagePreview();
        this.checkUserAuth();
        this.loadStores();
        
        // Debug: Check if form fields are accessible
        setTimeout(() => {
            this.debugFormFields();
        }, 1000);
    }

    initializeEventListeners() {
        // Store info form - update save button state when user types
        const storeForm = document.getElementById('storeInfoForm');
        if (storeForm) {
            const inputs = storeForm.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    // Update currentStore with the new value
                    if (input.id === 'storeName') {
                        this.currentStore.name = input.value;
                    } else if (input.id === 'storeDescription') {
                        this.currentStore.description = input.value;
                    } else if (input.id === 'storeCategory') {
                        this.currentStore.category = input.value;
                    }
                    // Update save button state
                    this.updateSaveButtonState();
                });
            });
        }

        // Product form
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addProduct();
            });
        }

        // File uploads
        this.setupFileUploads();

        // Auto-fetch product data when URL is entered
        const productUrlInput = document.getElementById('productUrl');
        if (productUrlInput) {
            productUrlInput.addEventListener('blur', () => {
                this.autoFetchProductData();
            });
        }
    }

    updateSaveButtonState() {
        const saveBtn = document.getElementById('saveStoreBtn');
        if (!saveBtn) return;
        const enabled = this.currentStore.name && this.currentStore.name.trim() && this.currentStore.products.length > 0;
        saveBtn.disabled = !enabled;
        if (enabled) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Your Store';
        } else {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Add store info & products first';
        }
    }

    async saveStoreToServer() {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                showNotification('Please sign in to save your store', 'error');
                return;
            }

            const payload = {
                id: this.currentStore.dbId || null,
                name: this.currentStore.name,
                description: this.currentStore.description,
                category: this.currentStore.category,
                banner: this.currentStore.banner,
                logo: this.currentStore.logo,
                products: this.currentStore.products,
                userId: currentUser.id,
                storeUrl: this.currentStore.customUrl || ''
            };

            const response = await fetch('/api/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to save store');
            }

            const data = await response.json();
            const saved = data.store;
            this.currentStore.dbId = saved.id;
            this.currentStore.url = saved.url;
            this.currentStore.published = true;

            // Add or update the store in the stores array
            const existingStoreIndex = this.stores.findIndex(s => s.dbId === saved.id);
            if (existingStoreIndex >= 0) {
                this.stores[existingStoreIndex] = { ...this.currentStore };
            } else {
                this.stores.push({ ...this.currentStore });
            }
            
            // Ensure the store has the correct URL from server response
            this.currentStore.url = saved.url;
            this.currentStore.storeUrl = saved.storeUrl;
            
            // Also update the store in the stores array with the correct URL
            if (existingStoreIndex >= 0) {
                this.stores[existingStoreIndex].url = saved.url;
                this.stores[existingStoreIndex].storeUrl = saved.storeUrl;
            } else {
                this.stores[this.stores.length - 1].url = saved.url;
                this.stores[this.stores.length - 1].storeUrl = saved.storeUrl;
            }

            // Generate QR and show URL
            this.generateStoreQR();
            const generatedSection = document.getElementById('generatedStore');
            const storeUrlInput = document.getElementById('storeUrl');
            if (generatedSection && storeUrlInput) {
                storeUrlInput.value = this.currentStore.url;
                generatedSection.style.display = 'block';
                generatedSection.scrollIntoView({ behavior: 'smooth' });
            }

            // Update stores list to show the new store
            this.updateStoresList();

            showNotification('Store saved! Your store URL is ready.', 'success');
        } catch (error) {
            console.error('Save store error:', error);
            showNotification(error.message, 'error');
        }
    }

    setupFileUploads() {
        // Banner upload
        const bannerUpload = document.getElementById('bannerUpload');
        const bannerFile = document.getElementById('bannerFile');
        const bannerPreview = document.getElementById('bannerPreview');
        const removeBanner = document.getElementById('removeBanner');

        if (bannerUpload && bannerFile) {
            bannerUpload.addEventListener('click', () => bannerFile.click());
            bannerFile.addEventListener('change', (e) => {
                this.handleFileUpload(e, bannerPreview, removeBanner, 'banner');
            });
            removeBanner?.addEventListener('click', () => {
                this.removeFile('banner', bannerPreview, removeBanner, bannerFile);
            });
        }

        // Logo upload
        const logoUpload = document.getElementById('logoUpload');
        const logoFile = document.getElementById('logoFile');
        const logoPreview = document.getElementById('logoPreview');
        const removeLogo = document.getElementById('removeLogo');

        if (logoUpload && logoFile) {
            logoUpload.addEventListener('click', () => logoFile.click());
            logoFile.addEventListener('change', (e) => {
                this.handleFileUpload(e, logoPreview, removeLogo, 'logo');
            });
            removeLogo?.addEventListener('click', () => {
                this.removeFile('logo', logoPreview, removeLogo, logoFile);
            });
        }
    }

    handleFileUpload(event, preview, removeBtn, type) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size
        const maxSize = type === 'banner' ? 5 * 1024 * 1024 : 2 * 1024 * 1024; // 5MB for banner, 2MB for logo
        if (file.size > maxSize) {
            showNotification(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`, 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            preview.src = dataUrl;
            preview.style.display = 'block';
            removeBtn.style.display = 'block';
            
            // Update current store
            this.currentStore[type] = dataUrl;
            this.updateStorePreview();
            this.updateSaveButtonState && this.updateSaveButtonState();
            
            showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`, 'success');
        };
        reader.readAsDataURL(file);
    }

    removeFile(type, preview, removeBtn, fileInput) {
        preview.style.display = 'none';
        removeBtn.style.display = 'none';
        fileInput.value = '';
        this.currentStore[type] = '';
        this.updateStorePreview();
        this.updateSaveButtonState && this.updateSaveButtonState();
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} removed`, 'info');
    }

    updateStoreInfo() {
        const storeName = document.getElementById('storeName')?.value || '';
        const storeDescription = document.getElementById('storeDescription')?.value || '';
        const storeCategory = document.getElementById('storeCategory')?.value || '';

        this.currentStore.name = storeName;
        this.currentStore.description = storeDescription;
        this.currentStore.category = storeCategory;

        this.updateStorePreview();
        this.checkGenerateButtonState();
        this.updateSaveButtonState && this.updateSaveButtonState();
        this.updateSaveButtonState && this.updateSaveButtonState();
    }

    async autoFetchProductData() {
        console.log('autoFetchProductData called');
        
        const productUrlElement = document.getElementById('productUrl');
        if (!productUrlElement) {
            console.error('productUrl element not found');
            showNotification('Form element not found. Please refresh the page.', 'error');
            return;
        }
        
        const productUrl = productUrlElement.value.trim();
        console.log('Product URL:', productUrl);
        
        if (!productUrl) {
            showNotification('Please enter a product URL first', 'error');
            return;
        }
        
        // Validate URL format
        try {
            new URL(productUrl);
            console.log('URL is valid');
        } catch (error) {
            console.error('Invalid URL:', error);
            showNotification('Please enter a valid URL', 'error');
            return;
        }
        
        try {
            showNotification('Fetching product data...', 'info');
            
            // Disable fetch button during fetching
            const fetchBtn = document.querySelector('.fetch-btn');
            if (fetchBtn) {
                fetchBtn.disabled = true;
                fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';
            }
            
            let success = false;
            let productInfo = {};
            
            // Try multiple proxy services
            const proxyServices = [
                {
                    name: 'AllOrigins',
                    url: 'https://api.allorigins.win/get?url=',
                    parseResponse: async (response) => {
                        const data = await response.json();
                        return data.contents;
                    }
                },
                {
                    name: 'CorsAnywhere',
                    url: 'https://cors-anywhere.herokuapp.com/',
                    parseResponse: async (response) => {
                        return await response.text();
                    }
                },
                {
                    name: 'CorsProxy',
                    url: 'https://corsproxy.io/?',
                    parseResponse: async (response) => {
                        return await response.text();
                    }
                },
                {
                    name: 'ProxyCors',
                    url: 'https://proxy.cors.sh/',
                    parseResponse: async (response) => {
                        return await response.text();
                    }
                },
                {
                    name: 'CorsBypass',
                    url: 'https://cors-bypass-proxy.herokuapp.com/',
                    parseResponse: async (response) => {
                        return await response.text();
                    }
                }
            ];
            
            for (const proxy of proxyServices) {
                try {
                    console.log(`Trying ${proxy.name}...`);
                    
                    const response = await fetch(proxy.url + encodeURIComponent(productUrl), {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json, text/html',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    if (!response.ok) {
                        console.log(`${proxy.name} failed with status:`, response.status);
                        continue;
                    }
                    
                    const html = await proxy.parseResponse(response);
                    
                    if (!html || html.length < 100) {
                        console.log(`${proxy.name} returned insufficient content`);
                        continue;
                    }
                    
                    console.log(`${proxy.name} success! HTML length:`, html.length);
                    
                    // Create a temporary DOM element to parse the HTML
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Extract product information
                    productInfo = this.extractProductInfo(doc);
                    console.log('Extracted product info:', productInfo);
                    
                    success = true;
                    break;
                    
                } catch (error) {
                    console.log(`${proxy.name} error:`, error.message);
                    continue;
                }
            }
            
            if (!success) {
                // Fallback: Create demo data based on URL
                console.log('All proxies failed, creating demo data...');
                const urlParts = productUrl.split('/');
                const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || 'product';
                
                // Clean up the product name from URL
                let cleanName = lastPart.replace(/[-_]/g, ' ').replace(/\.\w+$/, '').replace(/\?.*$/, '');
                cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                
                productInfo = {
                    name: cleanName || 'Sample Product',
                    price: '$99.99',
                    description: 'Product details extracted from URL - please update with actual information',
                    image: ''
                };
                showNotification('Live fetch failed. Demo data created from URL - please update manually.', 'info');
                console.log('Demo data created:', productInfo);
            }
            
            // Update form fields with fetched data
            let fieldsUpdated = 0;
            
            if (productInfo.name && productInfo.name.trim()) {
                document.getElementById('productName').value = productInfo.name.trim();
                fieldsUpdated++;
            }
            if (productInfo.price && productInfo.price.trim()) {
                document.getElementById('productPrice').value = productInfo.price.trim();
                fieldsUpdated++;
            }
            if (productInfo.image && productInfo.image.trim()) {
                document.getElementById('productImage').value = productInfo.image.trim();
                this.showImagePreview(productInfo.image.trim());
                fieldsUpdated++;
            }
            if (productInfo.description && productInfo.description.trim()) {
                document.getElementById('productDescription').value = productInfo.description.trim();
                fieldsUpdated++;
            }
            
            if (success && fieldsUpdated > 0) {
                showNotification(`Product data fetched! Updated ${fieldsUpdated} field(s).`, 'success');
            } else if (fieldsUpdated > 0) {
                showNotification(`Demo data inserted. Updated ${fieldsUpdated} field(s) - please verify and update.`, 'info');
            } else {
                showNotification('No data could be extracted. Please fill manually.', 'error');
            }
            
        } catch (error) {
            console.error('Auto-fetch error:', error);
            showNotification(`Fetching failed: ${error.message}. Please fill manually.`, 'error');
        } finally {
            // Re-enable fetch button
            const fetchBtn = document.querySelector('.fetch-btn');
            if (fetchBtn) {
                fetchBtn.disabled = false;
                fetchBtn.innerHTML = '<i class="fas fa-download"></i> Fetch';
            }
        }
    }

    extractProductInfo(doc) {
        let productName = '';
        let productPrice = '';
        let productImage = '';
        let productDescription = '';
        
        console.log('Starting product info extraction...');
        
        // Try to find product name from various meta tags and elements
        const nameSelectors = [
            'meta[property="og:title"]',
            'meta[name="title"]',
            '[data-testid="product-title"]',
            '.product-title',
            '.product-name',
            'h1.title',
            'h1',
            'h2',
            '.title',
            'title'
        ];
        
        for (const selector of nameSelectors) {
            try {
                const element = doc.querySelector(selector);
                if (element) {
                    if (element.tagName === 'META') {
                        productName = element.getAttribute('content') || '';
                    } else {
                        productName = element.textContent || element.innerText || '';
                    }
                    
                    productName = productName.trim();
                    if (productName && productName.length > 3) {
                        console.log(`Found product name with selector ${selector}:`, productName);
                        break;
                    }
                }
            } catch (e) {
                console.log(`Error with selector ${selector}:`, e);
            }
        }
        
        // Try to find product price with comprehensive selectors
        const priceSelectors = [
            '[data-price]', '.price', '.product-price', '.price-current',
            '.price-value', '[class*="price"]', 'span[class*="price"]',
            '.amount', '.cost', '[itemprop="price"]', '.sale-price', '.regular-price'
        ];
        
        for (const selector of priceSelectors) {
            const priceElements = doc.querySelectorAll(selector);
            for (const priceElement of priceElements) {
                const priceText = priceElement.textContent.trim();
                if (priceText.match(/[\$€£₹¥₹₽₩₪₦₨₫₴₸₺₼₾₿]|\d+\.?\d*/)) {
                    productPrice = priceText;
                    break;
                }
            }
            if (productPrice) break;
        }
        
        // Try to find product image
        const ogImage = doc.querySelector('meta[property="og:image"]');
        const productImageSelectors = [
            '.product-image img', '.product-img img', '.main-image img',
            '.hero-image img', '[class*="product"] img', 'img[class*="product"]',
            '.gallery img', '.image-container img', 'img[src*="product"]', 'img[src*="image"]'
        ];
        
        if (ogImage) {
            productImage = ogImage.getAttribute('content');
        } else {
            for (const selector of productImageSelectors) {
                const imgElements = doc.querySelectorAll(selector);
                for (const imgElement of imgElements) {
                    const imgSrc = imgElement.src;
                    if (imgSrc && (imgSrc.includes('http') || imgSrc.includes('https'))) {
                        productImage = imgSrc;
                        break;
                    }
                }
                if (productImage) break;
            }
        }
        
        // Try to find product description
        const ogDescription = doc.querySelector('meta[property="og:description"]');
        const metaDescription = doc.querySelector('meta[name="description"]');
        const descriptionSelectors = [
            '.product-description', '.description', '.product-details',
            '.product-info', '[class*="description"]', '.summary', '.details', 'p[class*="desc"]'
        ];
        
        if (ogDescription) {
            productDescription = ogDescription.getAttribute('content');
        } else if (metaDescription) {
            productDescription = metaDescription.getAttribute('content');
        } else {
            for (const selector of descriptionSelectors) {
                const descElements = doc.querySelectorAll(selector);
                for (const descElement of descElements) {
                    const descText = descElement.textContent.trim();
                    if (descText.length > 20 && descText.length < 200) {
                        productDescription = descText;
                        break;
                    }
                }
                if (productDescription) break;
            }
        }
        
        return { name: productName, price: productPrice, image: productImage, description: productDescription };
    }

    showImagePreview(imageUrl) {
        const previewSection = document.getElementById('imagePreviewSection');
        const previewImage = document.getElementById('productImagePreview');
        
        if (!imageUrl || !imageUrl.trim()) {
            previewSection.style.display = 'none';
            return;
        }

        // Show loading state
        previewSection.style.display = 'block';
        previewImage.src = '';
        previewImage.alt = 'Loading...';
        
        // Test if image loads successfully
        const testImage = new Image();
        testImage.onload = () => {
            previewImage.src = imageUrl;
            previewImage.alt = 'Product Preview';
            console.log('Image preview loaded successfully');
        };
        
        testImage.onerror = () => {
            previewImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNTBMMTUwIDEwMEgxMDBWMTUwSDUwVjEwMEgxMDBWNTBaIiBmaWxsPSIjQ0JENUUwIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Q0EzQUYiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPHN2Zz4=';
            previewImage.alt = 'Image not found';
            console.log('Failed to load image:', imageUrl);
        };
        
        testImage.src = imageUrl;
    }

    hideImagePreview() {
        const previewSection = document.getElementById('imagePreviewSection');
        previewSection.style.display = 'none';
    }

    initializeImagePreview() {
        // Add event listener to product image URL field
        const productImageField = document.getElementById('productImage');
        if (productImageField) {
            let timeout;
            productImageField.addEventListener('input', (e) => {
                clearTimeout(timeout);
                // Debounce the preview update
                timeout = setTimeout(() => {
                    const imageUrl = e.target.value.trim();
                    if (imageUrl) {
                        this.showImagePreview(imageUrl);
                    } else {
                        this.hideImagePreview();
                    }
                }, 500); // Wait 500ms after user stops typing
            });
        }
    }

    addProduct() {
        const productName = document.getElementById('productName')?.value.trim();
        const productUrl = document.getElementById('productUrl')?.value.trim();
        const productImage = document.getElementById('productImage')?.value.trim();
        const productPrice = document.getElementById('productPrice')?.value.trim();
        const productDescription = document.getElementById('productDescription')?.value.trim();
        
        if (!productName || !productUrl) {
            showNotification('Please fill in the required fields', 'error');
            return;
        }

        const product = {
            id: Date.now(),
            name: productName,
            url: productUrl,
            image: productImage,
            price: productPrice,
            description: productDescription,
            addedAt: new Date().toLocaleDateString()
        };
        
        this.currentStore.products.unshift(product);
        this.updateProductsDisplay();
        this.updateStorePreview();
        this.checkGenerateButtonState();
        this.updateSaveButtonState && this.updateSaveButtonState();
        
        // Clear form and close modal
        document.getElementById('productForm')?.reset();
        this.closeProductModal();
        
        showNotification('Product added successfully!', 'success');
    }

    updateProductsDisplay() {
        const container = document.getElementById('productsList');
        if (!container) return;
        
        if (this.currentStore.products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>No Products Yet</h3>
                    <p>Start building your store by adding your first product</p>
                    <button class="primary-btn" onclick="cliqart.openProductModal()">
                        <i class="fas fa-plus"></i> Add Your First Product
                    </button>
                </div>
            `;
            return;
        }

        const productsHTML = this.currentStore.products.map(product => `
            <div class="product-card-mini">
                <div class="product-image-mini">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'">` : 
                        `<div class="product-placeholder-mini"><i class="fas fa-image"></i></div>`
                    }
                </div>
                <div class="product-info-mini">
                    <h4>${product.name}</h4>
                    ${product.price ? `<p class="product-price">${product.price}</p>` : ''}
                    ${product.description ? `<p class="product-description">${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</p>` : ''}
                </div>
                <div class="product-actions-mini">
                    <button onclick="cliqart.editProduct(${product.id})" class="action-btn-mini">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="cliqart.deleteProduct(${product.id})" class="action-btn-mini delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="products-header">
                <h3>Products (${this.currentStore.products.length})</h3>
                <button class="primary-btn" onclick="cliqart.openProductModal()">
                    <i class="fas fa-plus"></i> Add More Product
                </button>
            </div>
            ${productsHTML}
        `;
    }

    updateStorePreview() {
        const container = document.getElementById('storePreview');
        if (!container) return;

        if (!this.currentStore.name && this.currentStore.products.length === 0) {
            container.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-store"></i>
                    <h3>Store Preview</h3>
                    <p>Add store information and products to see your store preview</p>
                </div>
            `;
            return;
        }

        const previewHTML = `
            <div class="store-preview-content">
                ${this.currentStore.banner ? `
                    <div class="preview-banner">
                        <img src="${this.currentStore.banner}" alt="Store Banner">
                    </div>
                ` : ''}
                
                <div class="preview-header">
                    ${this.currentStore.logo ? `
                        <div class="preview-logo">
                            <img src="${this.currentStore.logo}" alt="Store Logo">
                        </div>
                    ` : ''}
                    <div class="preview-info">
                        <h2>${this.currentStore.name || 'Your Store Name'}</h2>
                        ${this.currentStore.description ? `<p>${this.currentStore.description}</p>` : ''}
                        ${this.currentStore.category ? `<span class="category-badge">${this.getCategoryLabel(this.currentStore.category)}</span>` : ''}
                    </div>
                </div>
                
                <div class="preview-products">
                    <h3>Products (${this.currentStore.products.length})</h3>
                    <div class="preview-products-grid">
                        ${this.currentStore.products.slice(0, 6).map(product => `
                            <div class="preview-product">
                                ${product.image ? `<img src="${product.image}" alt="${product.name}">` : '<div class="preview-product-placeholder"><i class="fas fa-image"></i></div>'}
                                <div class="preview-product-info">
                                    <h4>${product.name}</h4>
                                    ${product.price ? `<p class="price">${product.price}</p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                        ${this.currentStore.products.length > 6 ? `
                            <div class="preview-product more">
                                <div class="more-indicator">
                                    <i class="fas fa-plus"></i>
                                    <span>+${this.currentStore.products.length - 6} more</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = previewHTML;
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

    checkGenerateButtonState() {
        const generateBtn = document.getElementById('generateBtn');
        if (!generateBtn) return;

        const hasRequiredInfo = this.currentStore.name.trim() && this.currentStore.products.length > 0;
        generateBtn.disabled = !hasRequiredInfo;
        
        if (hasRequiredInfo) {
            generateBtn.innerHTML = '<i class="fas fa-link"></i> Generate Store Link';
        } else {
            generateBtn.innerHTML = '<i class="fas fa-link"></i> Add store info & products first';
        }
    }

    generateStoreLink() {
        if (!this.currentStore.name.trim() || this.currentStore.products.length === 0) {
            showNotification('Please add store information and at least one product', 'error');
            return;
        }

        // Get current user ID
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            showNotification('Please log in to save your store permanently', 'error');
            return;
        }

        // Generate unique store ID and URL
        this.currentStore.id = this.generateUniqueId();
        this.currentStore.createdAt = new Date().toISOString();
        this.currentStore.url = `https://linqrius.com/store/${this.currentStore.id}`;
        this.currentStore.userId = currentUser.id;
        this.currentStore.userEmail = currentUser.email;
        this.currentStore.published = true;

        // Save to stores
        this.stores.push({ ...this.currentStore });
        this.saveStores();

        // Generate QR code for the store
        this.generateStoreQR();

        // Show generated store section
        const generatedSection = document.getElementById('generatedStore');
        const storeUrlInput = document.getElementById('storeUrl');
        
        if (generatedSection && storeUrlInput) {
            storeUrlInput.value = this.currentStore.url;
            generatedSection.style.display = 'block';
            generatedSection.scrollIntoView({ behavior: 'smooth' });
        }

        showNotification(`Store saved permanently for ${currentUser.email} and link generated!`, 'success');
    }

    generateStoreQR() {
        const qrContainer = document.getElementById('storeQRCode');
        if (!qrContainer || typeof QRCode === 'undefined') return;

        QRCode.toDataURL(this.currentStore.url, {
            errorCorrectionLevel: 'H',
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        }).then(dataUrl => {
            qrContainer.innerHTML = `<img src="${dataUrl}" alt="Store QR Code" class="store-qr-image">`;
            this.currentStore.qrCode = dataUrl;
        }).catch(error => {
            console.error('QR generation error:', error);
            qrContainer.innerHTML = '<p>Failed to generate QR code</p>';
        });
    }

    generateUniqueId() {
        return 'store_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    deleteProduct(id) {
        if (confirm('Are you sure you want to delete this product?')) {
            this.currentStore.products = this.currentStore.products.filter(product => product.id !== id);
        this.updateProductsDisplay();
        this.updateStorePreview();
        this.checkGenerateButtonState();
        this.updateSaveButtonState && this.updateSaveButtonState();
            showNotification('Product deleted successfully!', 'success');
        }
    }

    editProduct(id) {
        const product = this.currentStore.products.find(p => p.id === id);
        if (!product) return;

        // Populate form with product data
        document.getElementById('productName').value = product.name;
        document.getElementById('productUrl').value = product.url;
        document.getElementById('productImage').value = product.image || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productDescription').value = product.description || '';

        // Remove product and open modal for editing
        this.deleteProduct(id);
        this.openProductModal();
    }

    saveStores() {
        // Get current user
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            console.error('No user logged in, cannot save stores');
            return;
        }

        // Only save to localStorage as backup, don't overwrite Supabase data
        const allStores = JSON.parse(localStorage.getItem('cliqart_stores') || '[]');
        const otherUsersStores = allStores.filter(store => store.userId !== currentUser.id);
        const updatedStores = [...otherUsersStores, ...this.stores];
        localStorage.setItem('cliqart_stores', JSON.stringify(updatedStores));
        
        console.log(`Saved ${this.stores.length} stores locally as backup for user:`, currentUser.email);
        console.log('Primary storage is now Supabase - stores will survive page refreshes!');
    }

    async loadStores() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            this.stores = []; // No user logged in
            return;
        }

        try {
            // Load stores from Supabase
            const response = await fetch(`/api/stores?userId=${currentUser.id}`);
            if (!response.ok) {
                throw new Error('Failed to load stores');
            }

            const data = await response.json();
            if (data.success && data.stores) {
                this.stores = data.stores.map(store => ({
                    ...store,
                    userId: currentUser.id, // Ensure userId is set
                    dbId: store.id // Map database ID
                }));
                console.log(`Loaded ${this.stores.length} stores from Supabase for user:`, currentUser.email);
                
                // Update UI if stores exist
                if (this.stores.length > 0) {
                    // Set the first store as current if none is selected
                    if (!this.currentStore.id && !this.currentStore.dbId) {
                        this.currentStore = { ...this.stores[0] };
                        console.log('Set current store:', this.currentStore.name);
                    }
                    this.updateStoresList();
                }
            } else {
                this.stores = [];
                console.log('No stores found in Supabase');
            }
        } catch (error) {
            console.error('Error loading stores from Supabase:', error);
            // Fallback to localStorage if Supabase fails
            const saved = localStorage.getItem('cliqart_stores');
            if (saved) {
                const allStores = JSON.parse(saved);
                this.stores = allStores.filter(store => store.userId === currentUser.id);
                console.log(`Fallback: Loaded ${this.stores.length} stores from localStorage`);
            } else {
                this.stores = [];
            }
        }
    }

    getCurrentUser() {
        const userData = localStorage.getItem('linqrius_user') || sessionStorage.getItem('linqrius_user');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
                return null;
            }
        }
        return null;
    }

    async checkUserAuth() {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            console.log('User authenticated:', currentUser.email);
            // Update any user-specific UI elements
            this.updateUserUI(currentUser);
            // Load stores from Supabase
            await this.loadStores();
        } else {
            console.log('No user authenticated');
            // Show a notification about logging in for persistent storage
            setTimeout(() => {
                showNotification('💡 Sign in to save your stores permanently!', 'info');
            }, 3000);
        }
    }

    updateUserUI(user) {
        // Update user name in header if element exists
        const userNameElements = document.querySelectorAll('#userName');
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = user.firstName || user.email;
            }
        });

        // Show user menu and hide auth buttons
        const userMenu = document.getElementById('userMenu');
        const authButtons = document.getElementById('authButtons');
        
        if (userMenu) userMenu.style.display = 'flex';
        if (authButtons) authButtons.style.display = 'none';
    }

    updateStoresList() {
        console.log(`Stores loaded: ${this.stores.length} stores available`);
        
        const existingStoresSection = document.getElementById('existingStoresSection');
        const existingStoresList = document.getElementById('existingStoresList');
        
        if (!existingStoresSection || !existingStoresList) {
            console.log('Existing stores section not found in HTML');
            return;
        }
        
        if (this.stores.length === 0) {
            existingStoresSection.style.display = 'none';
            return;
        }
        
        // Show the section
        existingStoresSection.style.display = 'block';
        
        // Generate HTML for stores
        const storesHTML = this.stores.map(store => `
            <div class="store-card" onclick="cliqart.loadStore('${store.dbId || store.id}')">
                <div class="store-card-header">
                    <div class="store-card-logo">
                        ${store.logo ? 
                            `<img src="${store.logo}" alt="${store.name}" onerror="this.style.display='none'">` : 
                            `<div class="logo-placeholder"><i class="fas fa-store"></i></div>`
                        }
                    </div>
                    <div class="store-card-info">
                        <h4>${store.name}</h4>
                        <p>${store.description || 'No description'}</p>
                    </div>
                </div>
                <div class="store-card-stats">
                    <div class="store-stat">
                        <div class="store-stat-value">${store.products ? store.products.length : 0}</div>
                        <div class="store-stat-label">Products</div>
                    </div>
                    <div class="store-stat">
                        <div class="store-stat-value">${store.views || 0}</div>
                        <div class="store-stat-label">Views</div>
                    </div>
                </div>
                <div class="store-card-actions">
                    <button class="edit-btn" onclick="event.stopPropagation(); cliqart.editStore('${store.dbId || store.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="view-btn" onclick="event.stopPropagation(); cliqart.viewStore('${store.dbId || store.id}')">
                        <i class="fas fa-external-link-alt"></i> View
                    </button>
                    <button class="delete-btn" onclick="event.stopPropagation(); cliqart.deleteStore('${store.dbId || store.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        existingStoresList.innerHTML = storesHTML;
        
        // If there are existing stores, we could show them in a list
        // For now, we'll just ensure the current store is properly set
        if (this.stores.length > 0) {
            // Set the first store as current if none is selected
            if (!this.currentStore.id && !this.currentStore.dbId) {
                this.currentStore = { ...this.stores[0] };
                this.updateProductsDisplay();
                this.updateStorePreview();
                this.updateSaveButtonState();
            }
        }
    }

    // Store management methods
    loadStore(storeId) {
        console.log('🔧 loadStore called with storeId:', storeId);
        const store = this.stores.find(s => (s.dbId === storeId) || (s.id === storeId));
        console.log('🔧 Found store:', store);
        
        if (store) {
            this.currentStore = { ...store };
            console.log('🔧 Updated currentStore:', this.currentStore);
            
            this.updateProductsDisplay();
            this.updateStorePreview();
            this.updateSaveButtonState();
            this.updateStoreInfo();
            showNotification(`Loaded store: ${store.name}`, 'success');
        } else {
            showNotification('Store not found', 'error');
        }
    }

    editStore(storeId) {
        const store = this.stores.find(s => (s.dbId === storeId) || (s.id === storeId));
        if (store) {
            this.currentStore = { ...store };
            this.updateProductsDisplay();
            this.updateStorePreview();
            this.updateSaveButtonState();
            this.updateStoreInfo();
            showNotification(`Editing store: ${store.name}`, 'info');
        } else {
            showNotification('Store not found', 'error');
        }
    }

    viewStore(storeId) {
        const store = this.stores.find(s => (s.dbId === storeId) || (s.id === storeId));
        if (store) {
            // Open store in new tab
            const storeUrl = store.url || `/store/${store.storeUrl || store.id}`;
            window.open(storeUrl, '_blank');
        } else {
            showNotification('Store not found', 'error');
        }
    }

    updateStoreInfo() {
        console.log('🔧 updateStoreInfo called with currentStore:', this.currentStore);
        
        // Update form fields with current store info
        const nameField = document.getElementById('storeName');
        const descriptionField = document.getElementById('storeDescription');
        const categoryField = document.getElementById('storeCategory');
        
        console.log('🔧 Form fields found:', {
            nameField: !!nameField,
            descriptionField: !!descriptionField,
            categoryField: !!categoryField
        });
        
        if (nameField) {
            nameField.value = this.currentStore.name || '';
            console.log('✅ Updated storeName field with:', this.currentStore.name);
        } else {
            console.error('❌ storeName field not found');
        }
        
        if (descriptionField) {
            descriptionField.value = this.currentStore.description || '';
            console.log('✅ Updated storeDescription field with:', this.currentStore.description);
        } else {
            console.error('❌ storeDescription field not found');
        }
        
        if (categoryField) {
            categoryField.value = this.currentStore.category || '';
            console.log('✅ Updated storeCategory field with:', this.currentStore.category);
        } else {
            console.error('❌ storeCategory field not found');
        }
        
        // Update banner and logo previews if they exist
        if (this.currentStore.banner) {
            const bannerPreview = document.getElementById('bannerPreview');
            if (bannerPreview) {
                bannerPreview.src = this.currentStore.banner;
                bannerPreview.style.display = 'block';
                console.log('✅ Updated banner preview');
            }
        }
        
        if (this.currentStore.logo) {
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.src = this.currentStore.logo;
                logoPreview.style.display = 'block';
                console.log('✅ Updated logo preview');
            }
        }
        
        console.log('🔧 updateStoreInfo completed');
    }

    debugFormFields() {
        console.log('🔍 Debug: Checking form field accessibility...');
        
        const nameField = document.getElementById('storeName');
        const descriptionField = document.getElementById('storeDescription');
        const categoryField = document.getElementById('storeCategory');
        
        console.log('🔍 Form fields found:', {
            nameField: nameField,
            descriptionField: descriptionField,
            categoryField: categoryField
        });
        
        if (nameField) {
            console.log('✅ storeName field accessible, current value:', nameField.value);
        } else {
            console.error('❌ storeName field NOT found');
        }
        
        if (descriptionField) {
            console.log('✅ storeDescription field accessible, current value:', descriptionField.value);
        } else {
            console.error('❌ storeDescription field NOT found');
        }
        
        if (categoryField) {
            console.log('✅ storeCategory field accessible, current value:', categoryField.value);
        } else {
            console.error('❌ storeCategory field NOT found');
        }
        
        // Also check if the form exists
        const storeInfoForm = document.getElementById('storeInfoForm');
        console.log('🔍 storeInfoForm found:', !!storeInfoForm);
    }

    async deleteStore(storeId) {
        const store = this.stores.find(s => (s.dbId === storeId) || (s.id === storeId));
        if (!store) {
            showNotification('Store not found', 'error');
            return;
        }

        // Confirm deletion
        if (!confirm(`Are you sure you want to delete "${store.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            // Delete from Supabase
            const response = await fetch(`/api/stores/${storeId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Failed to delete store');
            }

            // Remove from local stores array
            this.stores = this.stores.filter(s => (s.dbId !== storeId) && (s.id !== storeId));
            
            // If the deleted store was the current store, clear it
            if ((this.currentStore.dbId === storeId) || (this.currentStore.id === storeId)) {
                this.currentStore = {
                    id: null,
                    name: '',
                    description: '',
                    category: '',
                    banner: '',
                    logo: '',
                    products: [],
                    createdAt: null,
                    url: ''
                };
                this.updateProductsDisplay();
                this.updateStorePreview();
                this.updateSaveButtonState();
                this.updateStoreInfo();
            }

            // Update the UI
            this.updateStoresList();
            
            showNotification(`Store "${store.name}" deleted successfully`, 'success');
        } catch (error) {
            console.error('Delete store error:', error);
            showNotification(`Failed to delete store: ${error.message}`, 'error');
        }
    }

    // Modal functions
    openProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Store actions
    previewStore() {
        if (!this.currentStore.name.trim()) {
            showNotification('Please add store name first', 'error');
            return;
        }

        // Create a preview in a new window/tab
        const previewWindow = window.open('', '_blank');
        const previewHTML = this.generateStoreHTML();
        previewWindow.document.write(previewHTML);
        previewWindow.document.close();
    }

    generateStoreHTML() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${this.currentStore.name} - Powered by LinQrius</title>
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
                    ${this.currentStore.banner ? `<img src="${this.currentStore.banner}" alt="Store Banner" class="store-banner">` : ''}
                    
                    <div class="store-header">
                        ${this.currentStore.logo ? `<img src="${this.currentStore.logo}" alt="Store Logo" class="store-logo">` : ''}
                        <div class="store-info">
                            <h1>${this.currentStore.name}</h1>
                            ${this.currentStore.description ? `<p>${this.currentStore.description}</p>` : ''}
                            ${this.currentStore.category ? `<span class="category-badge">${this.getCategoryLabel(this.currentStore.category)}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="products-section">
                        <h2>Our Products (${this.currentStore.products.length})</h2>
                        <div class="products-grid">
                            ${this.currentStore.products.map(product => `
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
}

// Global functions for LinQart
function openProductModal() {
    if (window.cliqart) {
        window.cliqart.openProductModal();
    }
}

function closeProductModal() {
    if (window.cliqart) {
        window.cliqart.closeProductModal();
    }
}

function previewStore() {
    if (window.cliqart) {
        window.cliqart.previewStore();
    }
}

function saveStore() {
    if (window.cliqart && window.cliqart.saveStoreToServer) {
        window.cliqart.saveStoreToServer();
    }
}

function generateStoreLink() {
    if (window.cliqart) {
        window.cliqart.generateStoreLink();
    }
}

function copyStoreUrl() {
    const storeUrlInput = document.getElementById('storeUrl');
    if (storeUrlInput) {
        storeUrlInput.select();
        document.execCommand('copy');
        showNotification('Store URL copied to clipboard!', 'success');
    }
}

function downloadStoreQR() {
    if (window.cliqart && window.cliqart.currentStore.qrCode) {
        const link = document.createElement('a');
        link.download = `${window.cliqart.currentStore.name.replace(/[^a-zA-Z0-9]/g, '_')}_store_qr.png`;
        link.href = window.cliqart.currentStore.qrCode;
        link.click();
    }
}

function shareStore(platform) {
    if (!window.cliqart || !window.cliqart.currentStore.url) return;

    const url = window.cliqart.currentStore.url;
    const text = `Check out my store: ${window.cliqart.currentStore.name}`;
    
    let shareUrl = '';
    switch (platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank');
    }
}

// Initialize LinQart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cliqart = new LinQart();
    
    // Modal functionality
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modals.forEach(modal => modal.style.display = 'none');
        }
    });
});

// Global function to call fetch
function fetchProductData() {
    console.log('Fetch button clicked');
    if (window.cliQartApp) {
        console.log('Calling autoFetchProductData...');
        window.cliQartApp.autoFetchProductData();
    } else {
        console.error('cliQartApp not found');
        showNotification('App not initialized. Please refresh the page.', 'error');
    }
}

// Global function to remove image preview
function removeImagePreview() {
    console.log('Remove image preview clicked');
    if (window.cliQartApp) {
        window.cliQartApp.hideImagePreview();
        // Clear the image URL field
        const imageField = document.getElementById('productImage');
        if (imageField) {
            imageField.value = '';
        }
        showNotification('Image preview removed', 'info');
    }
}

// Deployment ready - LinQrius LinQart v1.0

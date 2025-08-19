// LinQrius Link Shortener with API Key Authentication
class LinkShortener {
    constructor() {
        this.apiKey = 'sk-linqrius-2024-secure-key-12345'; // Default API key
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadLinks();
        this.setupApiKeyInput();
    }

    setupApiKeyInput() {
        // Add API key input to the form
        const form = document.querySelector('.shortener-form');
        if (form) {
            const apiKeyGroup = document.createElement('div');
            apiKeyGroup.className = 'form-group';
            apiKeyGroup.innerHTML = `
                <label for="apiKey">API Key:</label>
                <input type="password" id="apiKey" class="form-control" 
                       value="${this.apiKey}" placeholder="Enter your API key">
                <small class="form-text">Your API key is required to create short links</small>
            `;
            
            // Insert before the first form group
            const firstGroup = form.querySelector('.form-group');
            form.insertBefore(apiKeyGroup, firstGroup);
            
            // Update API key when input changes
            document.getElementById('apiKey').addEventListener('input', (e) => {
                this.apiKey = e.target.value;
            });
        }
    }

    setupEventListeners() {
        const form = document.querySelector('.shortener-form');
        console.log('Form found:', form); // Debug log
        
        if (form) {
            console.log('Adding submit event listener to form'); // Debug log
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Form submitted, calling shortenUrl'); // Debug log
                this.shortenUrl();
            });
        } else {
            console.error('Form not found with selector .shortener-form'); // Debug log
        }

        // Copy button functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                this.copyToClipboard(e.target.dataset.url);
            }
        });
    }

    async shortenUrl() {
        console.log('shortenUrl method called'); // Debug log
        
        const urlInput = document.getElementById('originalUrl');
        const resultSection = document.getElementById('resultSection');
        const loadingDiv = document.getElementById('loading');

        console.log('Elements found:', { urlInput, resultSection, loadingDiv }); // Debug log

        // Check if required elements exist
        if (!urlInput) {
            console.error('URL input field not found');
            this.showError('Form error: URL field not found');
            return;
        }

        const originalUrl = urlInput.value.trim();
        console.log('Original URL:', originalUrl); // Debug log

        if (!originalUrl) {
            this.showError('Please enter a URL');
            return;
        }

        if (!this.apiKey) {
            this.showError('Please enter your API key');
            return;
        }

        // Show loading if loading div exists
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
        }
        if (resultSection) {
            resultSection.style.display = 'none';
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/links`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    originalUrl: originalUrl,
                    userId: 'anonymous' // Temporary fix - will be updated when auth is implemented
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess(data);
                urlInput.value = '';
                this.loadLinks(); // Refresh the links list
            } else {
                this.showError(data.error || 'Failed to create short link');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
        }
    }

    async loadLinks() {
        const linksContainer = document.getElementById('recentLinks');
        if (!linksContainer) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/links?userId=anonymous`, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.links) {
                    this.displayLinks(data.links);
                } else {
                    this.displayLinks([]);
                }
            } else {
                linksContainer.innerHTML = '<p class="error">Failed to load links</p>';
            }
        } catch (error) {
            console.error('Error loading links:', error);
            linksContainer.innerHTML = '<p class="error">Error loading links</p>';
        }
    }

    displayLinks(links) {
        const linksContainer = document.getElementById('recentLinks');
        if (!linksContainer) return;

        if (links.length === 0) {
            linksContainer.innerHTML = '<div class="no-links"><i class="fas fa-link"></i><p>No links created yet</p><small>Start by shortening your first link above</small></div>';
            return;
        }

        const linksHtml = links.map(link => `
            <div class="link-item">
                <div class="link-info">
                    <div class="original-url">
                        <strong>Original:</strong> 
                        <a href="${link.originalUrl}" target="_blank" rel="noopener noreferrer">
                            ${link.originalUrl}
                        </a>
                    </div>
                    <div class="short-url">
                        <strong>Short:</strong> 
                        <a href="${link.shortUrl}" target="_blank" rel="noopener noreferrer">
                            ${link.shortUrl}
                        </a>
                    </div>
                    <div class="link-stats">
                        <span class="clicks">👁️ ${link.clicks || 0} clicks</span>
                        <span class="created">📅 ${link.createdAt ? new Date(link.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                </div>
                <div class="link-actions">
                    <button class="copy-btn btn btn-secondary" data-url="${link.shortUrl}">
                        📋 Copy
                    </button>
                    <button class="delete-btn btn btn-danger" onclick="linkShortener.deleteLink('${link.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');

        linksContainer.innerHTML = linksHtml;
    }

    async deleteLink(linkId) {
        if (!confirm('Are you sure you want to delete this link?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/links/${linkId}`, {
                method: 'DELETE',
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                this.loadLinks(); // Refresh the list
                this.showSuccess('Link deleted successfully');
        } else {
                const data = await response.json();
                this.showError(data.error || 'Failed to delete link');
            }
        } catch (error) {
            console.error('Error deleting link:', error);
            this.showError('Network error. Please try again.');
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showSuccess('Link copied to clipboard!');
        }).catch(() => {
            this.showError('Failed to copy link');
        });
    }

    showSuccess(data) {
        // Display the shortened link result
        const resultSection = document.getElementById('resultSection');
        const shortenedUrl = document.getElementById('shortenedUrl');
        const clickCount = document.getElementById('clickCount');
        const createdDate = document.getElementById('createdDate');
        const clickableLink = document.getElementById('clickableLink');
        const testLink = document.getElementById('testLink');
        
        if (resultSection && shortenedUrl) {
            // Get the base URL for the shortened link
            const baseUrl = window.location.origin;
            
            // Update the shortened URL - make it the full clickable URL
            let fullShortUrl = '';
            if (data.link && data.link.shortUrl) {
                fullShortUrl = `${baseUrl}/${data.link.shortUrl}`;
                shortenedUrl.value = fullShortUrl;
            } else if (data.shortUrl) {
                fullShortUrl = `${baseUrl}/${data.shortUrl}`;
                shortenedUrl.value = fullShortUrl;
            }
            
            // Update the clickable test link
            if (clickableLink && testLink && fullShortUrl) {
                testLink.href = fullShortUrl;
                testLink.textContent = fullShortUrl;
                clickableLink.style.display = 'block';
            }
            
            // Update stats
            if (clickCount) clickCount.textContent = '0';
            if (createdDate) createdDate.textContent = new Date().toLocaleDateString();
            
            // Show the result section
            resultSection.style.display = 'block';
            
            // Scroll to result
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Also show success message
        this.showMessage('Link shortened successfully!', 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }

    copyToClipboard() {
        const shortenedUrl = document.getElementById('shortenedUrl');
        if (shortenedUrl && shortenedUrl.value) {
            navigator.clipboard.writeText(shortenedUrl.value).then(() => {
                this.showSuccess('Link copied to clipboard!');
            }).catch(() => {
                this.showError('Failed to copy link');
            });
        }
    }

    generateQRCode() {
        console.log('generateQRCode method called'); // Debug log
        
        const shortenedUrl = document.getElementById('shortenedUrl');
        const qrSection = document.getElementById('qrSection');
        const qrDisplay = document.getElementById('qrDisplay');
        
        console.log('QR elements found:', { shortenedUrl, qrSection, qrDisplay }); // Debug log
        
        if (shortenedUrl && shortenedUrl.value && qrSection && qrDisplay) {
            console.log('Generating QR code for:', shortenedUrl.value); // Debug log
            
            try {
                // Use the QR Generator module
                if (window.QRGenerator) {
                    const qrGen = new window.QRGenerator();
                    
                    // Generate QR code (now handles async waiting)
                    qrGen.generateQRCode(shortenedUrl.value, qrDisplay, {
                        width: 200,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    }).then((canvas) => {
                        if (canvas) {
                            // Store canvas reference for download
                            qrDisplay.dataset.canvas = 'true';
                            
                            // Show QR section
                            qrSection.style.display = 'block';
                            console.log('QR section displayed successfully'); // Debug log
                        }
                    }).catch((error) => {
                        console.error('QR generation failed:', error);
                        this.showError('Failed to generate QR code: ' + error.message);
                    });
                    
                } else {
                    console.error('QR Generator module not found');
                    this.showError('QR Generator module not loaded');
                }
            } catch (error) {
                console.error('QR generation error:', error);
                this.showError('Failed to generate QR code: ' + error.message);
            }
        } else {
            console.error('Required elements not found for QR generation');
            this.showError('Cannot generate QR code - missing elements');
        }
    }

    shareLink() {
        const shortenedUrl = document.getElementById('shortenedUrl');
        if (shortenedUrl && shortenedUrl.value && navigator.share) {
            navigator.share({
                title: 'Check out this link',
                url: shortenedUrl.value
            }).catch(() => {
                this.showError('Failed to share link');
            });
        } else if (shortenedUrl && shortenedUrl.value) {
            // Fallback: copy to clipboard
            this.copyToClipboard();
        }
    }

    viewAnalytics() {
        this.showMessage('Analytics feature coming soon!', 'success');
    }

    downloadQR() {
        const qrDisplay = document.getElementById('qrDisplay');
        if (qrDisplay && qrDisplay.dataset.canvas === 'true') {
            const canvas = qrDisplay.querySelector('canvas');
            if (canvas && window.QRGenerator) {
                try {
                    const qrGen = new window.QRGenerator();
                    qrGen.downloadQR(canvas, 'linqrius-qr-code.png');
                } catch (error) {
                    console.error('QR download failed:', error);
                    this.showError('Failed to download QR code');
                }
            } else {
                console.error('No canvas found for QR download');
                this.showError('No QR code to download');
            }
        } else {
            console.error('No QR code generated yet');
            this.showError('Please generate a QR code first');
        }
    }
}

// Coming Soon function for future features
function showComingSoon(featureName) {
    // Create a nice coming soon notification
    const notification = document.createElement('div');
    notification.className = 'coming-soon-notification';
    notification.innerHTML = `
        <div class="coming-soon-content">
            <i class="fas fa-rocket"></i>
            <h4>${featureName}</h4>
            <p>🚀 Coming in a future update!</p>
            <p>We're working hard to bring you this feature.</p>
            <button onclick="this.parentElement.parentElement.remove()" class="close-notification">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
    
    console.log(`${featureName} - Coming Soon notification displayed`);
}

// Initialize the link shortener when the page loads
let linkShortener;
document.addEventListener('DOMContentLoaded', () => {
    linkShortener = new LinkShortener();
    console.log('LinkShortener initialized successfully'); // Debug log
});

// Link Shortener JavaScript
class LinkShortener {
    constructor() {
        this.baseUrl = 'https://linqrius.com/LinQ/';
        this.currentShortenedLink = null;
        this.initializeLinkShortener();
    }

    initializeLinkShortener() {
        this.loadRecentLinks();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const form = document.getElementById('linkShortenerForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.shortenLink();
            });
        }

        // Modal functionality
        const modal = document.getElementById('authModal');
        const closeButtons = document.querySelectorAll('.close');

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    generateShortId(length = 5) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async shortenLink() {
        const originalUrl = document.getElementById('originalUrl').value.trim();
        const customAlias = document.getElementById('customAlias').value.trim();
        const linkTitle = document.getElementById('linkTitle').value.trim();

        if (!originalUrl) {
            showNotification('Please enter a valid URL', 'error');
            return;
        }

        // Validate URL
        try {
            new URL(originalUrl);
        } catch (error) {
            showNotification('Please enter a valid URL', 'error');
            return;
        }

        try {
            // Generate short ID
            let shortId = customAlias || this.generateShortId();
            
            // Check if custom alias already exists
            if (customAlias && this.isAliasExists(customAlias)) {
                showNotification('Custom alias already exists. Please choose another.', 'error');
                return;
            }

            // Create shortened link
            const shortUrl = this.baseUrl + shortId;
            const linkData = {
                id: Date.now().toString(),
                originalUrl: originalUrl,
                shortUrl: shortUrl,
                shortId: shortId,
                title: linkTitle || this.extractDomain(originalUrl),
                clicks: 0,
                createdAt: new Date().toISOString(),
                userId: this.getCurrentUserId()
            };

            // Save to localStorage
            this.saveLinkData(linkData);

            // Display result
            this.displayResult(linkData);

            // Reset form
            document.getElementById('linkShortenerForm').reset();

            // Reload recent links
            this.loadRecentLinks();

            showNotification('Link shortened successfully!', 'success');

        } catch (error) {
            console.error('Error shortening link:', error);
            showNotification('Failed to shorten link. Please try again.', 'error');
        }
    }

    isAliasExists(alias) {
        const links = this.getAllLinks();
        return links.some(link => link.shortId === alias);
    }

    extractDomain(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch (error) {
            return 'Unknown Domain';
        }
    }

    getCurrentUserId() {
        const user = JSON.parse(localStorage.getItem('linqrius_user') || sessionStorage.getItem('linqrius_user') || 'null');
        return user ? user.id : 'anonymous';
    }

    saveLinkData(linkData) {
        const links = this.getAllLinks();
        links.push(linkData);
        localStorage.setItem('linqrius_links', JSON.stringify(links));
    }

    getAllLinks() {
        return JSON.parse(localStorage.getItem('linqrius_links') || '[]');
    }

    getUserLinks() {
        const userId = this.getCurrentUserId();
        return this.getAllLinks().filter(link => link.userId === userId);
    }

    displayResult(linkData) {
        this.currentShortenedLink = linkData;
        
        // Show result section
        const resultSection = document.getElementById('resultSection');
        resultSection.style.display = 'block';

        // Populate data
        document.getElementById('shortenedUrl').value = linkData.shortUrl;
        document.getElementById('clickCount').textContent = linkData.clicks;
        document.getElementById('createdDate').textContent = new Date(linkData.createdAt).toLocaleDateString();

        // Scroll to result
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    loadRecentLinks() {
        const links = this.getUserLinks().slice(-10).reverse(); // Last 10 links
        const container = document.getElementById('recentLinks');

        if (links.length === 0) {
            container.innerHTML = `
                <div class="no-links">
                    <i class="fas fa-link"></i>
                    <p>No links created yet</p>
                    <small>Start by shortening your first link above</small>
                </div>
            `;
            return;
        }

        const linksHTML = links.map(link => `
            <div class="link-card">
                <div class="link-header">
                    <h4>${link.title}</h4>
                    <div class="link-stats">
                        <span class="click-count">
                            <i class="fas fa-eye"></i> ${link.clicks}
                        </span>
                    </div>
                </div>
                <div class="link-urls">
                    <div class="short-url">
                        <input type="text" value="${link.shortUrl}" readonly>
                        <button onclick="linkShortener.copyLink('${link.shortUrl}')" class="copy-btn">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="original-url" title="${link.originalUrl}">
                        ${this.truncateUrl(link.originalUrl, 50)}
                    </div>
                </div>
                <div class="link-actions">
                    <button onclick="linkShortener.generateQRForLink('${link.shortUrl}')" class="mini-btn">
                        <i class="fas fa-qrcode"></i>
                    </button>
                    <button onclick="linkShortener.shareSpecificLink('${link.shortUrl}')" class="mini-btn">
                        <i class="fas fa-share"></i>
                    </button>
                    <button onclick="linkShortener.deleteLink('${link.id}')" class="mini-btn danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="link-meta">
                    <small>Created: ${new Date(link.createdAt).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = linksHTML;
    }

    truncateUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }

    copyLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Link copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy link', 'error');
        });
    }

    generateQRForLink(url) {
        if (typeof QRCode === 'undefined') {
            showNotification('QR Code library not loaded', 'error');
            return;
        }

        QRCode.toDataURL(url, {
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
                    <h3>QR Code for ${url}</h3>
                    <div style="text-align: center; margin: 20px 0;">
                        <img src="${dataUrl}" alt="QR Code" style="max-width: 100%; border-radius: 10px;">
                    </div>
                    <div style="text-align: center;">
                        <button onclick="linkShortener.downloadQRCode('${dataUrl}', '${url}')" class="primary-btn">
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

    downloadQRCode(dataUrl, url) {
        const link = document.createElement('a');
        link.download = `qr-${url.replace(/[^a-zA-Z0-9]/g, '')}.png`;
        link.href = dataUrl;
        link.click();
    }

    shareSpecificLink(url) {
        if (navigator.share) {
            navigator.share({
                title: 'Check out this link',
                url: url
            });
        } else {
            this.copyLink(url);
        }
    }

    deleteLink(linkId) {
        if (confirm('Are you sure you want to delete this link?')) {
            const links = this.getAllLinks();
            const updatedLinks = links.filter(link => link.id !== linkId);
            localStorage.setItem('linqrius_links', JSON.stringify(updatedLinks));
            this.loadRecentLinks();
            showNotification('Link deleted successfully!', 'success');
        }
    }
}

// Global functions for buttons
function copyToClipboard() {
    const input = document.getElementById('shortenedUrl');
    input.select();
    document.execCommand('copy');
    showNotification('Link copied to clipboard!', 'success');
}

function generateQRCode() {
    if (!linkShortener.currentShortenedLink) {
        showNotification('No link to generate QR code for', 'error');
        return;
    }

    const qrSection = document.getElementById('qrSection');
    const qrDisplay = document.getElementById('qrDisplay');

    if (typeof QRCode === 'undefined') {
        showNotification('QR Code library not loaded', 'error');
        return;
    }

    QRCode.toCanvas(qrDisplay, linkShortener.currentShortenedLink.shortUrl, {
        errorCorrectionLevel: 'H',
        width: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error) {
        if (error) {
            console.error('QR generation error:', error);
            showNotification('Failed to generate QR code', 'error');
        } else {
            qrSection.style.display = 'block';
            qrSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

function downloadQR() {
    const canvas = document.querySelector('#qrDisplay canvas');
    if (!canvas) {
        showNotification('No QR code to download', 'error');
        return;
    }

    const link = document.createElement('a');
    link.download = `qr-${linkShortener.currentShortenedLink.shortId}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function shareLink() {
    if (!linkShortener.currentShortenedLink) {
        showNotification('No link to share', 'error');
        return;
    }

    const url = linkShortener.currentShortenedLink.shortUrl;
    
    if (navigator.share) {
        navigator.share({
            title: linkShortener.currentShortenedLink.title,
            url: url
        });
    } else {
        copyToClipboard();
    }
}

function viewAnalytics() {
    showNotification('Analytics feature coming soon!', 'info');
}

// Authentication functions
function handleLogin(event) {
    event.preventDefault();
    if (window.authSystem) {
        return window.authSystem.login(event);
    }
}

function handleSignup(event) {
    event.preventDefault();
    if (window.authSystem) {
        return window.authSystem.signup(event);
    }
}

function handleForgotPassword(event) {
    event.preventDefault();
    if (window.authSystem) {
        return window.authSystem.forgotPassword(event);
    }
}

function openAuthModal(type) {
    if (window.openAuthModal) {
        window.openAuthModal(type);
    }
}

function switchAuth(type) {
    if (window.switchAuth) {
        window.switchAuth(type);
    }
}

function openForgotPassword() {
    if (window.openForgotPassword) {
        window.openForgotPassword();
    }
}

function toggleUserDropdown() {
    if (window.toggleUserDropdown) {
        window.toggleUserDropdown();
    }
}

function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.linkShortener = new LinkShortener();
});

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
        const form = document.querySelector('.shorten-form');
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
        const form = document.querySelector('.shorten-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.shortenUrl();
            });
        }

        // Copy button functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                this.copyToClipboard(e.target.dataset.url);
            }
        });
    }

    async shortenUrl() {
        const urlInput = document.getElementById('urlInput');
        const customAliasInput = document.getElementById('customAlias');
        const resultDiv = document.getElementById('result');
        const loadingDiv = document.getElementById('loading');

        const originalUrl = urlInput.value.trim();
        const customAlias = customAliasInput.value.trim();

        if (!originalUrl) {
            this.showError('Please enter a URL');
            return;
        }

        if (!this.apiKey) {
            this.showError('Please enter your API key');
            return;
        }

        // Show loading
        loadingDiv.style.display = 'block';
        resultDiv.style.display = 'none';

        try {
            const response = await fetch(`${this.baseUrl}/api/links`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                originalUrl: originalUrl,
                    customAlias: customAlias || undefined
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess(data);
                urlInput.value = '';
                customAliasInput.value = '';
                this.loadLinks(); // Refresh the links list
            } else {
                this.showError(data.error || 'Failed to create short link');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    async loadLinks() {
        const linksContainer = document.getElementById('linksList');
        if (!linksContainer) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/links`, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            if (response.ok) {
                const links = await response.json();
                this.displayLinks(links);
            } else {
                linksContainer.innerHTML = '<p class="error">Failed to load links</p>';
            }
        } catch (error) {
            console.error('Error loading links:', error);
            linksContainer.innerHTML = '<p class="error">Error loading links</p>';
        }
    }

    displayLinks(links) {
        const linksContainer = document.getElementById('linksList');
        if (!linksContainer) return;

        if (links.length === 0) {
            linksContainer.innerHTML = '<p class="no-links">No links created yet. Create your first short link above!</p>';
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
                            ${link.displayUrl}
                        </a>
                    </div>
                    <div class="link-stats">
                        <span class="clicks">👁️ ${link.clicks} clicks</span>
                        <span class="created">📅 ${link.createdAt}</span>
                    </div>
                </div>
                <div class="link-actions">
                    <button class="copy-btn btn btn-secondary" data-url="${link.shortUrl}">
                        📋 Copy
                    </button>
                    <button class="delete-btn btn btn-danger" onclick="linkShortener.deleteLink(${link.id})">
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

    showSuccess(message) {
        this.showMessage(message, 'success');
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
}

// Initialize the link shortener when the page loads
let linkShortener;
document.addEventListener('DOMContentLoaded', () => {
    linkShortener = new LinkShortener();
});

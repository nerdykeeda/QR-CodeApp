// QR Code Generator Module for LinQrius Link Shortener
class QRGenerator {
    constructor() {
        this.qrLibrary = null;
        this.init();
    }

    init() {
        // Wait for the library to be available
        this.waitForLibrary();
    }

    waitForLibrary() {
        // Check if library is already loaded
        if (typeof qrcode !== 'undefined') {
            this.qrLibrary = qrcode;
            console.log('QR Code library (qrcode@1.5.1) loaded successfully');
            return;
        }

        // If not loaded, wait for it
        console.log('Waiting for qrcode library to load...');
        let attempts = 0;
        const maxAttempts = 50; // Wait up to 5 seconds
        
        const checkLibrary = () => {
            attempts++;
            if (typeof qrcode !== 'undefined') {
                this.qrLibrary = qrcode;
                console.log('qrcode library loaded successfully after waiting');
            } else if (attempts < maxAttempts) {
                // Try again in 100ms
                setTimeout(checkLibrary, 100);
            } else {
                console.error('qrcode library failed to load after waiting');
            }
        };
        
        checkLibrary();
    }

    generateQRCode(url, targetElement, options = {}) {
        // Wait for library if not ready
        if (!this.qrLibrary) {
            console.log('Library not ready, waiting...');
            return new Promise((resolve, reject) => {
                const waitForReady = () => {
                    if (this.qrLibrary) {
                        this.generateQRCode(url, targetElement, options)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        setTimeout(waitForReady, 100);
                    }
                };
                waitForReady();
            });
        }

        if (!url) {
            throw new Error('URL is required to generate QR code');
        }

        if (!targetElement) {
            throw new Error('Target element is required');
        }

        // Default options
        const defaultOptions = {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            // Clear previous content
            targetElement.innerHTML = '';

            // Create canvas element
            const canvas = document.createElement('canvas');
            targetElement.appendChild(canvas);

            // Generate QR code using go-qrcode library
            this.qrLibrary.toCanvas(canvas, url, finalOptions, (error) => {
                if (error) {
                    console.error('QR Code generation error:', error);
                    targetElement.innerHTML = '<p class="error">Failed to generate QR code</p>';
                } else {
                    console.log('QR Code generated successfully with go-qrcode');
                }
            });

            return canvas;
        } catch (error) {
            console.error('QR Code generation failed:', error);
            targetElement.innerHTML = '<p class="error">QR generation failed</p>';
            throw error;
        }
    }

    downloadQR(canvas, filename = 'qr-code.png') {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }

        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL();
            link.click();
            console.log('QR Code downloaded successfully');
            return true;
        } catch (error) {
            console.error('QR Code download failed:', error);
            throw error;
        }
    }

    // Utility method to check if library is available
    isLibraryLoaded() {
        return this.qrLibrary !== null;
    }

    // Get library info
    getLibraryInfo() {
        if (this.qrLibrary) {
            return {
                name: 'qrcode',
                version: '1.5.1',
                available: true
            };
        }
        return {
            name: 'qrcode',
            version: 'unknown',
            available: false
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRGenerator;
} else {
    // Browser environment
    window.QRGenerator = QRGenerator;
}

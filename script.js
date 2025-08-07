// VCard QR Generator - Main JavaScript File

class VCardGenerator {
    constructor() {
        this.profileImageData = null;
        this.initializeEventListeners();
        this.setupFormValidation();
    }

    initializeEventListeners() {
        // Form submission
        document.getElementById('vcardForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateVCard();
        });

        // Profile picture upload
        document.getElementById('uploadArea').addEventListener('click', () => {
            document.getElementById('profilePicture').click();
        });

        document.getElementById('profilePicture').addEventListener('change', (e) => {
            this.handleProfilePictureUpload(e);
        });

        // Real-time preview updates
        const formInputs = document.querySelectorAll('#vcardForm input, #vcardForm textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updatePreview();
            });
        });

        // Download buttons
        document.getElementById('downloadQR').addEventListener('click', () => {
            this.downloadQRCode();
        });

        document.getElementById('downloadVCard').addEventListener('click', () => {
            this.downloadVCardFile();
        });
    }

    setupFormValidation() {
        // Add custom validation for phone numbers
        const mobileInput = document.getElementById('mobile');
        mobileInput.addEventListener('input', (e) => {
            this.validatePhoneNumber(e.target);
        });

        // Add custom validation for email
        const emailInput = document.getElementById('email');
        emailInput.addEventListener('input', (e) => {
            this.validateEmail(e.target);
        });
    }

    validatePhoneNumber(input) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const isValid = phoneRegex.test(input.value.replace(/\s/g, ''));
        
        if (input.value && !isValid) {
            input.setCustomValidity('Please enter a valid phone number');
        } else {
            input.setCustomValidity('');
        }
    }

    validateEmail(input) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(input.value);
        
        if (input.value && !isValid) {
            input.setCustomValidity('Please enter a valid email address');
        } else {
            input.setCustomValidity('');
        }
    }

    handleProfilePictureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (JPG, PNG, GIF)');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.profileImageData = e.target.result;
            
            // Show preview
            const preview = document.getElementById('profilePreview');
            const placeholder = document.querySelector('.upload-placeholder');
            
            preview.src = this.profileImageData;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            
            // Update live preview
            this.updatePreview();
        };
        reader.readAsDataURL(file);
    }

    getFormData() {
        return {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            jobTitle: document.getElementById('jobTitle').value.trim(),
            company: document.getElementById('company').value.trim(),
            mobile: document.getElementById('mobile').value.trim(),
            email: document.getElementById('email').value.trim(),
            website: document.getElementById('website').value.trim(),
            address: document.getElementById('address').value.trim(),
            linkedin: document.getElementById('linkedin').value.trim(),
            twitter: document.getElementById('twitter').value.trim(),
            facebook: document.getElementById('facebook').value.trim(),
            instagram: document.getElementById('instagram').value.trim(),
            github: document.getElementById('github').value.trim(),
            youtube: document.getElementById('youtube').value.trim(),
            profileImage: this.profileImageData
        };
    }

    updatePreview() {
        const data = this.getFormData();
        const preview = document.getElementById('cardPreview');
        
        if (!data.firstName && !data.lastName) {
            preview.innerHTML = `
                <h3>Preview</h3>
                <p>Fill the form to see your visiting card preview</p>
            `;
            return;
        }

        const fullName = `${data.firstName} ${data.lastName}`.trim();
        const jobCompany = [data.jobTitle, data.company].filter(Boolean).join(' at ');
        
        const socialLinks = this.generateSocialLinksHTML(data);
        
        preview.innerHTML = `
            <h3>Visiting Card Preview</h3>
            <div class="card-display">
                <div class="card-header">
                    ${data.profileImage ? `<img src="${data.profileImage}" alt="Profile" class="card-avatar">` : ''}
                    <div class="card-info">
                        <h4>${fullName}</h4>
                        ${jobCompany ? `<p>${jobCompany}</p>` : ''}
                    </div>
                </div>
                <div class="card-details">
                    ${data.mobile ? `<div class="card-detail-item"><i class="fas fa-phone"></i><span>${data.mobile}</span></div>` : ''}
                    ${data.email ? `<div class="card-detail-item"><i class="fas fa-envelope"></i><span>${data.email}</span></div>` : ''}
                    ${data.website ? `<div class="card-detail-item"><i class="fas fa-globe"></i><span>${data.website}</span></div>` : ''}
                    ${data.address ? `<div class="card-detail-item"><i class="fas fa-map-marker-alt"></i><span>${data.address}</span></div>` : ''}
                </div>
                ${socialLinks ? `<div class="social-links">${socialLinks}</div>` : ''}
            </div>
        `;
    }

    generateSocialLinksHTML(data) {
        const socialPlatforms = [
            { key: 'linkedin', icon: 'fab fa-linkedin', class: 'linkedin' },
            { key: 'twitter', icon: 'fab fa-twitter', class: 'twitter' },
            { key: 'facebook', icon: 'fab fa-facebook', class: 'facebook' },
            { key: 'instagram', icon: 'fab fa-instagram', class: 'instagram' },
            { key: 'github', icon: 'fab fa-github', class: 'github' },
            { key: 'youtube', icon: 'fab fa-youtube', class: 'youtube' }
        ];

        const links = socialPlatforms
            .filter(platform => data[platform.key])
            .map(platform => `
                <a href="${data[platform.key]}" target="_blank" class="social-link ${platform.class}">
                    <i class="${platform.icon}"></i>
                </a>
            `);

        return links.length > 0 ? links.join('') : '';
    }

    generateVCardData(data) {
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        
        // Helper function to escape vCard special characters
        const escapeVCardText = (text) => {
            if (!text) return '';
            return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
        };
        
        let vcard = 'BEGIN:VCARD\r\n';
        vcard += 'VERSION:3.0\r\n';
        vcard += `FN:${escapeVCardText(fullName)}\r\n`;
        vcard += `N:${escapeVCardText(data.lastName)};${escapeVCardText(data.firstName)};;;\r\n`;
        
        if (data.jobTitle) {
            vcard += `TITLE:${escapeVCardText(data.jobTitle)}\r\n`;
        }
        
        if (data.company) {
            vcard += `ORG:${escapeVCardText(data.company)}\r\n`;
        }
        
        if (data.mobile) {
            vcard += `TEL;TYPE=CELL:${escapeVCardText(data.mobile)}\r\n`;
        }
        
        if (data.email) {
            vcard += `EMAIL:${escapeVCardText(data.email)}\r\n`;
        }
        
        if (data.website) {
            vcard += `URL:${escapeVCardText(data.website)}\r\n`;
        }
        
        if (data.address) {
            vcard += `ADR:;;${escapeVCardText(data.address)};;;;\r\n`;
        }

        // Add social media as URLs (limit to avoid QR code size issues)
        const socialUrls = [];
        if (data.linkedin) socialUrls.push(data.linkedin);
        if (data.twitter) socialUrls.push(data.twitter);
        if (data.facebook) socialUrls.push(data.facebook);
        if (data.instagram) socialUrls.push(data.instagram);
        if (data.github) socialUrls.push(data.github);
        if (data.youtube) socialUrls.push(data.youtube);
        
        // Limit to first 3 social media links to keep QR code size manageable
        socialUrls.slice(0, 3).forEach(url => {
            vcard += `URL:${escapeVCardText(url)}\r\n`;
        });
        
        // Skip profile photo for QR code to avoid size issues
        // if (data.profileImage) {
        //     const base64Data = data.profileImage.split(',')[1];
        //     vcard += `PHOTO;ENCODING=BASE64;TYPE=JPEG:${base64Data}\r\n`;
        // }
        
        vcard += 'END:VCARD';
        
        console.log('Generated vCard:', vcard);
        return vcard;
    }

    async generateVCard() {
        const form = document.getElementById('vcardForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = this.getFormData();
        const vCardData = this.generateVCardData(data);
        
        // Show loading state
        const generateBtn = document.querySelector('.generate-btn');
        const originalHTML = generateBtn.innerHTML;
        generateBtn.innerHTML = '<div class="loading"></div> Generating...';
        generateBtn.disabled = true;

        try {
            // Generate QR Code
            await this.generateQRCode(vCardData);
            
            // Show QR section
            document.getElementById('qrSection').style.display = 'block';
            
            // Scroll to QR section
            document.getElementById('qrSection').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            let errorMessage = 'Error generating QR code. ';
            
            if (error.message.includes('QRCode library not loaded')) {
                errorMessage += 'Please check your internet connection and refresh the page.';
            } else if (error.message.includes('canvas element not found')) {
                errorMessage += 'UI error detected. Please refresh the page.';
            } else {
                errorMessage += 'Please try again. If the problem persists, try with shorter text or without special characters.';
            }
            
            alert(errorMessage);
        } finally {
            // Restore button state
            generateBtn.innerHTML = originalHTML;
            generateBtn.disabled = false;
        }
    }

    generateQRCode(vCardData) {
        return new Promise((resolve, reject) => {
            // Check if QRCode library is loaded
            if (typeof QRCode === 'undefined') {
                reject(new Error('QRCode library not loaded. Please check your internet connection.'));
                return;
            }

            const canvas = document.getElementById('qrcode');
            if (!canvas) {
                reject(new Error('QR code canvas element not found'));
                return;
            }

            console.log('Generating QR code with vCard data:', vCardData);
            
            try {
                QRCode.toCanvas(canvas, vCardData, {
                    width: 300,
                    height: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    errorCorrectionLevel: 'M'
                }, (error) => {
                    if (error) {
                        console.error('QRCode.toCanvas error:', error);
                        reject(error);
                    } else {
                        console.log('QR code generated successfully');
                        resolve();
                    }
                });
            } catch (syncError) {
                console.error('Synchronous error in QR code generation:', syncError);
                reject(syncError);
            }
        });
    }

    downloadQRCode() {
        const canvas = document.getElementById('qrcode');
        const link = document.createElement('a');
        link.download = 'vcard-qr-code.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    downloadVCardFile() {
        const data = this.getFormData();
        const vCardData = this.generateVCardData(data);
        
        const blob = new Blob([vCardData], { type: 'text/vcard' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${data.firstName}_${data.lastName}_vcard.vcf`;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VCardGenerator();
});

// Add some utility functions for better UX
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#48bb78' : '#f56565'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add drag and drop functionality for profile picture
document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('uploadArea');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.background = '#f0f4ff';
    }
    
    function unhighlight() {
        uploadArea.style.borderColor = '#cbd5e0';
        uploadArea.style.background = '#f8fafc';
    }
    
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const fileInput = document.getElementById('profilePicture');
            fileInput.files = files;
            fileInput.dispatchEvent(new Event('change'));
        }
    }
});
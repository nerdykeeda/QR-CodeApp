// VCard QR Generator - Main JavaScript File

class VCardGenerator {
    constructor() {
        this.profileImageData = null;
        this.cameraStream = null;
        this.initializeEventListeners();
        this.setupFormValidation();
        this.initializeModals();
    }

    initializeEventListeners() {
        // Form submission
        document.getElementById('vcardForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateVCard();
        });

        // Profile picture upload
        document.getElementById('profilePicture').addEventListener('change', (e) => {
            this.handleProfilePictureUpload(e);
        });

        // Upload area click to trigger file input
        document.getElementById('uploadArea').addEventListener('click', () => {
            document.getElementById('profilePicture').click();
        });

        // Camera functionality
        document.getElementById('takePhotoBtn').addEventListener('click', () => {
            this.openCamera();
        });

        document.getElementById('cropPhotoBtn').addEventListener('click', () => {
            this.openCropModal();
        });

        // Camera modal controls
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.capturePhoto();
        });

        document.getElementById('retakeBtn').addEventListener('click', () => {
            this.retakePhoto();
        });

        // Crop modal controls
        document.getElementById('cropSaveBtn').addEventListener('click', () => {
            this.saveCrop();
        });

        document.getElementById('cropCancelBtn').addEventListener('click', () => {
            this.closeCropModal();
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

        // Contact form
        document.getElementById('contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleContactForm();
        });
    }

    initializeModals() {
        // Close modals when clicking outside or on close button
        const modals = document.querySelectorAll('.modal');
        const closeButtons = document.querySelectorAll('.close');

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Stop camera stream if active
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        
        // Reset camera modal elements
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        if (video) video.style.display = 'block';
        if (canvas) canvas.style.display = 'none';
        
        // Reset camera buttons
        const captureBtn = document.getElementById('captureBtn');
        const retakeBtn = document.getElementById('retakeBtn');
        if (captureBtn) captureBtn.style.display = 'block';
        if (retakeBtn) retakeBtn.style.display = 'none';
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

    async openCamera() {
        try {
            // Check if camera permissions are available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Camera is not supported in this browser. Please use a modern browser with camera support.');
                return;
            }
            
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            const video = document.getElementById('cameraVideo');
            video.srcObject = this.cameraStream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                video.addEventListener('loadedmetadata', resolve, { once: true });
            });
            
            document.getElementById('cameraModal').style.display = 'block';
            document.getElementById('captureBtn').style.display = 'block';
            document.getElementById('retakeBtn').style.display = 'none';
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            if (error.name === 'NotAllowedError') {
                alert('Camera access was denied. Please allow camera permissions and try again.');
            } else if (error.name === 'NotFoundError') {
                alert('No camera found. Please connect a camera and try again.');
            } else {
                alert('Unable to access camera. Please make sure you have granted camera permissions.');
            }
        }
    }

    capturePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        const context = canvas.getContext('2d');
        
        // Check if video is ready
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            alert('Camera is not ready yet. Please wait a moment and try again.');
            return;
        }
        
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0);
        
        // Convert to data URL
        const photoData = canvas.toDataURL('image/jpeg');
        
        // Show the captured photo
        video.style.display = 'none';
        canvas.style.display = 'block';
        
        // Update buttons
        document.getElementById('captureBtn').style.display = 'none';
        document.getElementById('retakeBtn').style.display = 'block';
        
        // Store the photo data
        this.capturedPhotoData = photoData;
    }

    retakePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        
        video.style.display = 'block';
        canvas.style.display = 'none';
        
        document.getElementById('captureBtn').style.display = 'block';
        document.getElementById('retakeBtn').style.display = 'none';
    }

    openCropModal() {
        if (!this.profileImageData && !this.capturedPhotoData) {
            alert('Please upload or take a photo first.');
            return;
        }
        
        const cropImage = document.getElementById('cropImage');
        cropImage.src = this.profileImageData || this.capturedPhotoData;
        
        document.getElementById('cropModal').style.display = 'block';
        
        // Wait for image to load before initializing crop
        cropImage.onload = () => {
            this.initializeCrop();
        };
    }

    initializeCrop() {
        const cropBox = document.querySelector('.crop-box');
        const cropContainer = document.querySelector('.crop-container');
        const cropImage = document.getElementById('cropImage');
        
        if (!cropBox || !cropContainer || !cropImage) {
            console.error('Crop elements not found');
            return;
        }
        
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        // Reset crop box position
        cropBox.style.left = '50%';
        cropBox.style.top = '50%';
        cropBox.style.transform = 'translate(-50%, -50%)';
        
        // Mouse events
        cropBox.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = cropBox.offsetLeft;
            initialY = cropBox.offsetTop;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            // Constrain to container bounds
            const maxX = cropContainer.offsetWidth - cropBox.offsetWidth;
            const maxY = cropContainer.offsetHeight - cropBox.offsetHeight;
            
            cropBox.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
            cropBox.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
            cropBox.style.transform = 'none';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Touch events for mobile
        cropBox.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            initialX = cropBox.offsetLeft;
            initialY = cropBox.offsetTop;
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            // Constrain to container bounds
            const maxX = cropContainer.offsetWidth - cropBox.offsetWidth;
            const maxY = cropContainer.offsetHeight - cropBox.offsetHeight;
            
            cropBox.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
            cropBox.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
            cropBox.style.transform = 'none';
            e.preventDefault();
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    saveCrop() {
        const cropBox = document.querySelector('.crop-box');
        const cropImage = document.getElementById('cropImage');
        const cropContainer = document.querySelector('.crop-container');
        
        if (!cropBox || !cropImage || !cropContainer) {
            console.error('Crop elements not found');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create a new image to get dimensions
        const img = new Image();
        img.onload = () => {
            const cropSize = 200; // Size of the crop box
            canvas.width = cropSize;
            canvas.height = cropSize;
            
            // Get the actual displayed image dimensions
            const imageRect = cropImage.getBoundingClientRect();
            const containerRect = cropContainer.getBoundingClientRect();
            
            // Calculate the scale factors
            const scaleX = img.naturalWidth / imageRect.width;
            const scaleY = img.naturalHeight / imageRect.height;
            
            // Get crop box position relative to the image
            const cropBoxRect = cropBox.getBoundingClientRect();
            const cropX = (cropBoxRect.left - imageRect.left) * scaleX;
            const cropY = (cropBoxRect.top - imageRect.top) * scaleY;
            const cropWidth = cropBoxRect.width * scaleX;
            const cropHeight = cropBoxRect.height * scaleY;
            
            // Ensure crop coordinates are within image bounds
            const finalCropX = Math.max(0, Math.min(cropX, img.naturalWidth - cropWidth));
            const finalCropY = Math.max(0, Math.min(cropY, img.naturalHeight - cropHeight));
            const finalCropWidth = Math.min(cropWidth, img.naturalWidth - finalCropX);
            const finalCropHeight = Math.min(cropHeight, img.naturalHeight - finalCropY);
            
            // Draw cropped image
            ctx.drawImage(img, finalCropX, finalCropY, finalCropWidth, finalCropHeight, 0, 0, cropSize, cropSize);
            
            // Convert to data URL
            this.profileImageData = canvas.toDataURL('image/jpeg');
            
            // Update preview
            this.updateProfilePreview();
            this.closeCropModal();
        };
        img.src = cropImage.src;
    }

    closeCropModal() {
        document.getElementById('cropModal').style.display = 'none';
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
            this.updateProfilePreview();
            this.showCameraOptions();
        };
        reader.readAsDataURL(file);
    }

    updateProfilePreview() {
        const preview = document.getElementById('profilePreview');
        const placeholder = document.querySelector('.upload-placeholder');
        
        if (this.profileImageData) {
            preview.src = this.profileImageData;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            preview.style.display = 'none';
            placeholder.style.display = 'flex';
        }
        
        // Update live preview
        this.updatePreview();
    }



    showCameraOptions() {
        document.querySelector('.camera-options').style.display = 'flex';
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
            x: document.getElementById('x').value.trim(),
            facebook: document.getElementById('facebook').value.trim(),
            instagram: document.getElementById('instagram').value.trim(),
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
            { key: 'x', icon: 'fab fa-twitter', class: 'x-twitter' },
            { key: 'facebook', icon: 'fab fa-facebook', class: 'facebook' },
            { key: 'instagram', icon: 'fab fa-instagram', class: 'instagram' },
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
        
        let vcard = 'BEGIN:VCARD\n';
        vcard += 'VERSION:3.0\n';
        vcard += `FN:${fullName}\n`;
        vcard += `N:${data.lastName};${data.firstName};;;\n`;
        
        if (data.jobTitle) {
            vcard += `TITLE:${data.jobTitle}\n`;
        }
        
        if (data.company) {
            vcard += `ORG:${data.company}\n`;
        }
        
        if (data.mobile) {
            vcard += `TEL;TYPE=CELL:${data.mobile}\n`;
        }
        
        if (data.email) {
            vcard += `EMAIL:${data.email}\n`;
        }
        
        if (data.website) {
            vcard += `URL:${data.website}\n`;
        }
        
        if (data.address) {
            vcard += `ADR:;;${data.address};;;;\n`;
        }

        // Add social media as URLs (only once each)
        const socialLinks = [];
        if (data.linkedin) socialLinks.push(data.linkedin);
        if (data.x) socialLinks.push(data.x);
        if (data.facebook) socialLinks.push(data.facebook);
        if (data.instagram) socialLinks.push(data.instagram);
        if (data.youtube) socialLinks.push(data.youtube);
        
        // Add unique social links
        socialLinks.forEach(link => {
            vcard += `URL:${link}\n`;
        });
        
        // Add profile photo if available (with size check)
        if (data.profileImage) {
            try {
                const base64Data = data.profileImage.split(',')[1];
                // Check if the data size is reasonable (less than 2KB for QR code)
                if (base64Data.length < 2000) {
                    vcard += `PHOTO;ENCODING=BASE64;TYPE=JPEG:${base64Data}\n`;
                } else {
                    console.warn('Profile image too large for QR code, excluding to prevent errors');
                }
            } catch (error) {
                console.warn('Error processing profile image for QR code:', error);
            }
        }
        
        vcard += 'END:VCARD';
        
        return vcard;
    }

    generateVCardDataWithoutPhoto(data) {
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        
        let vcard = 'BEGIN:VCARD\n';
        vcard += 'VERSION:3.0\n';
        vcard += `FN:${fullName}\n`;
        vcard += `N:${data.lastName};${data.firstName};;;\n`;
        
        if (data.jobTitle) {
            vcard += `TITLE:${data.jobTitle}\n`;
        }
        
        if (data.company) {
            vcard += `ORG:${data.company}\n`;
        }
        
        if (data.mobile) {
            vcard += `TEL;TYPE=CELL:${data.mobile}\n`;
        }
        
        if (data.email) {
            vcard += `EMAIL:${data.email}\n`;
        }
        
        if (data.website) {
            vcard += `URL:${data.website}\n`;
        }
        
        if (data.address) {
            vcard += `ADR:;;${data.address};;;;\n`;
        }

        // Add social media as URLs (only once each)
        const socialLinks = [];
        if (data.linkedin) socialLinks.push(data.linkedin);
        if (data.x) socialLinks.push(data.x);
        if (data.facebook) socialLinks.push(data.facebook);
        if (data.instagram) socialLinks.push(data.instagram);
        if (data.youtube) socialLinks.push(data.youtube);
        
        // Add unique social links
        socialLinks.forEach(link => {
            vcard += `URL:${link}\n`;
        });
        
        // Note: Profile photo is excluded to keep QR code size manageable
        vcard += 'END:VCARD';
        
        return vcard;
    }

    generateQRCode(vCardData) {
        return new Promise((resolve, reject) => {
            const container = document.getElementById('qrcode');
            
            console.log('Starting QR code generation...');
            console.log('QRCode library available:', typeof QRCode !== 'undefined');
            console.log('Container element found:', !!container);
            console.log('vCard data length:', vCardData.length);
            
            // Check if QRCode library is available
            if (typeof QRCode === 'undefined') {
                console.error('QRCode library is not loaded');
                reject(new Error('QRCode library is not loaded'));
                return;
            }
            
            // Check if container element exists
            if (!container) {
                console.error('Container element not found');
                reject(new Error('Container element not found'));
                return;
            }
            
            // Validate vCard data
            if (!vCardData || vCardData.length < 10) {
                console.error('Invalid vCard data');
                reject(new Error('Invalid vCard data'));
                return;
            }
            
            try {
                console.log('Creating QR Code with working library...');
                console.log('vCard data size:', vCardData.length, 'characters');
                
                // Clear any existing QR code
                container.innerHTML = '';
                
                // Generate QR code with LinQ logo
                QRCode.toDataURL(vCardData, {
                    errorCorrectionLevel: 'H',
                    width: 512,
                    margin: 2,
                    color: { dark: '#000000', light: '#FFFFFF' }
                }).then(dataUrl => {
                    console.log('QR Code generated successfully, dataUrl length:', dataUrl.length);
                    console.log('Data URL starts with:', dataUrl.substring(0, 50));
                    
                    // Create a canvas to add LinQ logo
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const qrImg = new Image();
                    
                    qrImg.onload = () => {
                        // Set canvas size to match QR code
                        canvas.width = qrImg.width;
                        canvas.height = qrImg.height;
                        
                        // Draw QR code
                        ctx.drawImage(qrImg, 0, 0);
                        
                                                 // Add LinQ logo at bottom right corner
                         const logoSize = Math.min(qrImg.width, qrImg.height) * 0.08; // 8% of QR size
                         const logoX = qrImg.width - logoSize - 10; // 10px from right edge
                         const logoY = qrImg.height - logoSize - 10; // 10px from bottom edge
                         
                         // Create LinQ logo text with better visibility
                         ctx.fillStyle = '#000000';
                         ctx.font = `bold ${logoSize * 0.6}px Arial`;
                         ctx.textAlign = 'center';
                         ctx.textBaseline = 'middle';
                         
                         // Add text shadow for better visibility
                         ctx.shadowColor = '#ffffff';
                         ctx.shadowBlur = 3;
                         ctx.shadowOffsetX = 1;
                         ctx.shadowOffsetY = 1;
                         
                         // Add "LinQ" text
                         ctx.fillText('LinQ', logoX + logoSize/2, logoY + logoSize/2);
                         
                         // Reset shadow
                         ctx.shadowColor = 'transparent';
                         ctx.shadowBlur = 0;
                         ctx.shadowOffsetX = 0;
                         ctx.shadowOffsetY = 0;
                        
                        // Convert canvas to data URL
                        const finalDataUrl = canvas.toDataURL('image/png');
                        
                        // Create image element for display
                        const displayImg = document.createElement('img');
                        displayImg.onload = () => {
                            console.log('Image loaded successfully, dimensions:', displayImg.naturalWidth, 'x', displayImg.naturalHeight);
                            
                            // Clear container and add the image
                            container.innerHTML = '';
                            container.appendChild(displayImg);
                            
                            // Store the data URL for download
                            container.dataset.qrDataUrl = finalDataUrl;
                            
                            console.log('QR Code with LinQ logo displayed successfully');
                            resolve();
                        };
                        
                        displayImg.onerror = (error) => {
                            console.error('Image failed to load:', error);
                            reject(new Error('Failed to load QR code image'));
                        };
                        
                        displayImg.src = finalDataUrl;
                        displayImg.style.maxWidth = '100%';
                        displayImg.style.height = 'auto';
                        displayImg.style.borderRadius = '10px';
                        displayImg.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                    };
                    
                    qrImg.onerror = (error) => {
                        console.error('QR image failed to load:', error);
                        reject(new Error('Failed to load QR code image'));
                    };
                    
                    qrImg.src = dataUrl;
                    
                }).catch(error => {
                    console.error('QR Code generation error:', error);
                    
                    // If data is too big, try without profile image
                    if (error.message.includes('too big') || error.message.includes('data')) {
                        console.log('Data too large, trying without profile image...');
                        
                        // Generate vCard data without profile image
                        const data = this.getFormData();
                        const vCardDataWithoutPhoto = this.generateVCardDataWithoutPhoto(data);
                        
                        QRCode.toDataURL(vCardDataWithoutPhoto, {
                            errorCorrectionLevel: 'H',
                            width: 512,
                            margin: 2,
                            color: { dark: '#000000', light: '#FFFFFF' }
                        }).then(dataUrl => {
                            // Use the same canvas drawing logic for logo
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const qrImg = new Image();
                            
                            qrImg.onload = () => {
                                canvas.width = qrImg.width;
                                canvas.height = qrImg.height;
                                ctx.drawImage(qrImg, 0, 0);
                                
                                                                 // Add LinQ logo
                                 const logoSize = Math.min(qrImg.width, qrImg.height) * 0.08;
                                 const logoX = qrImg.width - logoSize - 10;
                                 const logoY = qrImg.height - logoSize - 10;
                                 
                                 // Create LinQ logo text with better visibility
                                 ctx.fillStyle = '#000000';
                                 ctx.font = `bold ${logoSize * 0.6}px Arial`;
                                 ctx.textAlign = 'center';
                                 ctx.textBaseline = 'middle';
                                 
                                 // Add text shadow for better visibility
                                 ctx.shadowColor = '#ffffff';
                                 ctx.shadowBlur = 3;
                                 ctx.shadowOffsetX = 1;
                                 ctx.shadowOffsetY = 1;
                                 
                                 // Add "LinQ" text
                                 ctx.fillText('LinQ', logoX + logoSize/2, logoY + logoSize/2);
                                 
                                 // Reset shadow
                                 ctx.shadowColor = 'transparent';
                                 ctx.shadowBlur = 0;
                                 ctx.shadowOffsetX = 0;
                                 ctx.shadowOffsetY = 0;
                                
                                const finalDataUrl = canvas.toDataURL('image/png');
                                
                                const displayImg = document.createElement('img');
                                displayImg.onload = () => {
                                    container.innerHTML = '';
                                    container.appendChild(displayImg);
                                    container.dataset.qrDataUrl = finalDataUrl;
                                    console.log('QR Code generated without profile image due to size constraints');
                                    resolve();
                                };
                                
                                displayImg.onerror = (error) => {
                                    console.error('Image failed to load:', error);
                                    reject(new Error('Failed to load QR code image'));
                                };
                                
                                displayImg.src = finalDataUrl;
                                displayImg.style.maxWidth = '100%';
                                displayImg.style.height = 'auto';
                                displayImg.style.borderRadius = '10px';
                                displayImg.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                            };
                            
                            qrImg.onerror = (error) => {
                                console.error('QR image failed to load:', error);
                                reject(new Error('Failed to load QR code image'));
                            };
                            
                            qrImg.src = dataUrl;
                            
                        }).catch(fallbackError => {
                            console.error('Fallback QR generation also failed:', fallbackError);
                            reject(fallbackError);
                        });
                    } else {
                        reject(error);
                    }
                });
                
            } catch (error) {
                console.error('QR Code generation exception:', error);
                reject(error);
            }
        });
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
            
            // Show success notification
            showNotification('QR Code generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            let errorMessage = 'Error generating QR code. ';
            
            if (error.message.includes('QRCode library is not loaded')) {
                errorMessage += 'Please check your internet connection and refresh the page.';
            } else if (error.message.includes('Canvas element not found')) {
                errorMessage += 'Please refresh the page and try again.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            alert(errorMessage);
        } finally {
            // Restore button state
            generateBtn.innerHTML = originalHTML;
            generateBtn.disabled = false;
        }
    }

    downloadQRCode() {
        const qrContainer = document.getElementById('qrcode');
        const qrDataUrl = qrContainer.dataset.qrDataUrl;
        
        if (!qrDataUrl) {
            alert('No QR code available to download. Please generate a QR code first.');
            return;
        }
        
        const link = document.createElement('a');
        link.download = 'vcard-qr-code.png';
        link.href = qrDataUrl;
        link.click();
    }

    generateFullVCardData(data) {
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        
        let vcard = 'BEGIN:VCARD\n';
        vcard += 'VERSION:3.0\n';
        vcard += `FN:${fullName}\n`;
        vcard += `N:${data.lastName};${data.firstName};;;\n`;
        
        if (data.jobTitle) {
            vcard += `TITLE:${data.jobTitle}\n`;
        }
        
        if (data.company) {
            vcard += `ORG:${data.company}\n`;
        }
        
        if (data.mobile) {
            vcard += `TEL;TYPE=CELL:${data.mobile}\n`;
        }
        
        if (data.email) {
            vcard += `EMAIL:${data.email}\n`;
        }
        
        if (data.website) {
            vcard += `URL:${data.website}\n`;
        }
        
        if (data.address) {
            vcard += `ADR:;;${data.address};;;;\n`;
        }

        // Add social media as URLs (only once each)
        const socialLinks = [];
        if (data.linkedin) socialLinks.push(data.linkedin);
        if (data.x) socialLinks.push(data.x);
        if (data.facebook) socialLinks.push(data.facebook);
        if (data.instagram) socialLinks.push(data.instagram);
        if (data.youtube) socialLinks.push(data.youtube);
        
        // Add unique social links
        socialLinks.forEach(link => {
            vcard += `URL:${link}\n`;
        });
        
        // Add profile photo if available (for downloadable vCard)
        if (data.profileImage) {
            console.log('Profile image found, adding to vCard...');
            try {
                const base64Data = data.profileImage.split(',')[1];
                console.log('Base64 data length:', base64Data.length);
                vcard += `PHOTO;ENCODING=BASE64;TYPE=JPEG:${base64Data}\n`;
                console.log('Profile photo added to vCard successfully');
            } catch (error) {
                console.error('Error processing profile image for vCard:', error);
            }
        } else {
            console.log('No profile image found in data');
        }
        
        vcard += 'END:VCARD';
        
        return vcard;
    }

    downloadVCardFile() {
        const data = this.getFormData();
        console.log('Downloading vCard with data:', data);
        console.log('Profile image exists:', !!data.profileImage);
        
        const vCardData = this.generateFullVCardData(data);
        console.log('Generated vCard data length:', vCardData.length);
        
        const blob = new Blob([vCardData], { type: 'text/vcard' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${data.firstName}_${data.lastName}_vcard.vcf`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        
        console.log('vCard file downloaded successfully');
    }

    handleContactForm() {
        const formData = {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value
        };

        // Validate form
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            alert('Please fill in all required fields.');
            return;
        }

        // Create mailto link for email
        const mailtoLink = `mailto:linqrius@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`)}`;
        
        // Try to open default email client
        const emailWindow = window.open(mailtoLink, '_blank');
        
        if (emailWindow) {
            // Show success message
            showNotification('Email client opened! Please send the email manually.', 'success');
        } else {
            // Fallback: copy email content to clipboard
            const emailContent = `To: linqrius@gmail.com\nSubject: ${formData.subject}\n\nName: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(emailContent).then(() => {
                    showNotification('Email content copied to clipboard! Please paste it in your email client.', 'success');
                }).catch(() => {
                    showNotification('Please manually send email to linqrius@gmail.com', 'info');
                });
            } else {
                showNotification('Please manually send email to linqrius@gmail.com', 'info');
            }
        }
        
        // Close modal and reset form
        document.getElementById('contactModal').style.display = 'none';
        document.getElementById('contactForm').reset();
    }
}

// Global function to open contact form
function openContactForm() {
    document.getElementById('contactModal').style.display = 'block';
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing VCard QR Generator...');
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    // Check if QRCode library is available
    if (typeof QRCode === 'undefined') {
        console.error('QRCode library not loaded! Please check if qrcode.min.js file exists.');
        alert('QRCode library not loaded! Please check if qrcode.min.js file exists.');
    } else {
        console.log('QRCode library available, initializing...');
        window.vcardGenerator = new VCardGenerator();
    }
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

// Authentication System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.initializeAuth();
    }

    initializeAuth() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('linqrius_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateAuthUI();
        }
        
        // Initialize auth form listeners
        this.initializeAuthForms();
    }

    initializeAuthForms() {
        // Login form
        const loginForm = document.getElementById('loginFormSubmit');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Signup form
        const signupForm = document.getElementById('signupFormSubmit');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgotPasswordFormSubmit');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }
    }

    handleLogin() {
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked;

        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        // Simple validation for demo purposes
        // In production, this would be a real API call
        const users = JSON.parse(localStorage.getItem('linqrius_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            this.currentUser = {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                createdAt: user.createdAt
            };

            // Save user session
            if (rememberMe) {
                localStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
            } else {
                sessionStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
            }

            this.updateAuthUI();
            this.closeAuthModal();
            showNotification(`Welcome back, ${user.firstName}!`, 'success');
        } else {
            showNotification('Invalid email or password', 'error');
        }
    }

    handleSignup() {
        const firstName = document.getElementById('signupFirstName')?.value.trim();
        const lastName = document.getElementById('signupLastName')?.value.trim();
        const email = document.getElementById('signupEmail')?.value.trim();
        const password = document.getElementById('signupPassword')?.value;
        const confirmPassword = document.getElementById('signupConfirmPassword')?.value;
        const agreeTerms = document.getElementById('agreeTerms')?.checked;

        // Validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 8) {
            showNotification('Password must be at least 8 characters long', 'error');
            return;
        }

        if (!agreeTerms) {
            showNotification('Please agree to the Terms & Conditions', 'error');
            return;
        }

        // Check if user already exists
        const users = JSON.parse(localStorage.getItem('linqrius_users') || '[]');
        if (users.some(u => u.email === email)) {
            showNotification('An account with this email already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            firstName,
            lastName,
            email,
            password, // In production, this would be hashed
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('linqrius_users', JSON.stringify(users));

        // Auto-login the new user
        this.currentUser = {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            createdAt: newUser.createdAt
        };

        localStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
        this.updateAuthUI();
        this.closeAuthModal();
        showNotification(`Welcome to LinQrius, ${firstName}!`, 'success');
    }

    handleForgotPassword() {
        const email = document.getElementById('forgotEmail')?.value.trim();

        if (!email) {
            showNotification('Please enter your email address', 'error');
            return;
        }

        // In production, this would send a real email
        showNotification('Password reset link sent to your email!', 'success');
        setTimeout(() => {
            switchAuth('login');
        }, 2000);
    }

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            // User is logged in
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'flex';
                userMenu.style.alignItems = 'center';
            }
            if (userName) userName.textContent = this.currentUser.firstName;
        } else {
            // User is not logged in
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('linqrius_user');
        sessionStorage.removeItem('linqrius_user');
        this.updateAuthUI();
        showNotification('Successfully logged out', 'info');
    }

    closeAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.style.display = 'none';
        }
    }
}

// Global auth functions
function openAuthModal(type) {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'block';
        switchAuth(type);
    }
}

function switchAuth(type) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotPasswordForm');

    // Hide all forms
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (forgotForm) forgotForm.style.display = 'none';

    // Show selected form
    switch (type) {
        case 'login':
            if (loginForm) loginForm.style.display = 'block';
            break;
        case 'signup':
            if (signupForm) signupForm.style.display = 'block';
            break;
        case 'forgot':
            if (forgotForm) forgotForm.style.display = 'block';
            break;
    }
}

function openForgotPassword() {
    switchAuth('forgot');
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function openProfile() {
    window.location.href = 'profile.html';
}

function openDashboard() {
    window.location.href = 'dashboard.html';
}

function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    }
    toggleUserDropdown();
}

// Initialize auth system
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});


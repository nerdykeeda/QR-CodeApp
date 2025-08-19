// VCard QR Generator - Main JavaScript File

class VCardGenerator {
    constructor() {
        this.profileImageData = null;
        this.cameraStream = null;
        this.qrLogoData = null; // Store QR logo data
        this.initializeEventListeners();
        this.setupFormValidation();
        this.initializeModals();
        this.updatePremiumFeatures(); // Call this when the page loads
    }

    // Digital card template themes
    getTemplateTheme(template) {
        const themes = {
            template1: {
                // Professional Business Card
                primaryColor: '#4c1d95', // Dark purple/maroon
                secondaryColor: '#6b7280', // Gray
                backgroundColor: '#ffffff', // White
                textColor: '#1f2937', // Dark text
                accentColor: '#4c1d95',
                bandColor: '#4c1d95', // Purple band
                lineColor: '#d1d5db' // Gray line
            }
        };
        return themes.template1;
    }

    // Check if user has premium access
    isPremiumUser() {
        // Allow local override for testing
        const premiumOverride = localStorage.getItem('linqrius_premium_override') === 'true';
        if (premiumOverride) return true;
        const currentUser = JSON.parse(localStorage.getItem('linqrius_user') || sessionStorage.getItem('linqrius_user') || 'null');
        if (!currentUser) return false;
        
        // Enable all premium features for testing email
        if (currentUser.email === 'spvinodmandan@gmail.com') {
            return true;
        }
        
        // Check if user has active premium subscription
        const premiumUsers = JSON.parse(localStorage.getItem('linqrius_premium_users') || '[]');
        return premiumUsers.some(user => user.email === currentUser.email && user.isActive);
    }

    // Update premium features visibility
    updatePremiumFeatures() {
        const isPremium = this.isPremiumUser();
        const premiumElements = document.querySelectorAll('.premium-badge, .premium-notice');
        
        premiumElements.forEach(element => {
            if (isPremium) {
                element.style.display = 'none';
            } else {
                element.style.display = 'inline-block';
            }
        });

        // Update logo upload area
        const logoUploadArea = document.getElementById('logoUploadArea');
        if (logoUploadArea) {
            if (isPremium) {
                logoUploadArea.style.opacity = '1';
                logoUploadArea.style.pointerEvents = 'auto';
            } else {
                logoUploadArea.style.opacity = '0.6';
                logoUploadArea.style.pointerEvents = 'none';
            }
        }
    }

    // Handle QR logo upload
    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Logo file size must be less than 2MB', 'error');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            showNotification('Please select a valid image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.qrLogoData = e.target.result;
            this.updateLogoPreview();
            showNotification('Logo uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }

    // Update logo preview
    updateLogoPreview() {
        const logoPreview = document.getElementById('logoPreview');
        const uploadPlaceholder = document.querySelector('#logoUploadArea .upload-placeholder');
        const removeLogoBtn = document.getElementById('removeLogoBtn');
        
        if (this.qrLogoData) {
            logoPreview.src = this.qrLogoData;
            logoPreview.style.display = 'block';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
            if (removeLogoBtn) removeLogoBtn.style.display = 'block';
        } else {
            logoPreview.style.display = 'none';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
            if (removeLogoBtn) removeLogoBtn.style.display = 'none';
        }
    }

    // Remove QR logo
    removeQRLogo() {
        this.qrLogoData = null;
        this.updateLogoPreview();
        document.getElementById('qrLogo').value = '';
        showNotification('Logo removed successfully', 'info');
    }

    // Helper method to finish QR code generation
    finishQRCodeGeneration(canvas, container, resolve) {
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
            
            // Update digital card preview QR code
            this.updateDigitalCardQR(finalDataUrl);
            
            console.log('QR Code with logo displayed successfully');
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

        // Explicit upload button
        const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        if (uploadPhotoBtn) {
            uploadPhotoBtn.addEventListener('click', () => {
                document.getElementById('profilePicture').click();
            });
        }

        // Logo upload for QR code center
        document.getElementById('qrLogo').addEventListener('change', (e) => {
            this.handleLogoUpload(e);
        });

        // Logo upload area click to trigger file input
        document.getElementById('logoUploadArea').addEventListener('click', () => {
            document.getElementById('qrLogo').click();
        });

        // Remove logo button
        document.getElementById('removeLogoBtn').addEventListener('click', () => {
            this.removeQRLogo();
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

        // Use captured photo
        const usePhotoBtn = document.getElementById('usePhotoBtn');
        if (usePhotoBtn) {
            usePhotoBtn.addEventListener('click', () => {
                this.applyCapturedPhoto();
            });
        }

        // Crop modal controls
        document.getElementById('cropSaveBtn').addEventListener('click', () => {
            this.saveCrop();
        });

        document.getElementById('cropCancelBtn').addEventListener('click', () => {
            this.closeCropModal();
        });

        // Real-time preview updates
        const formInputs = document.querySelectorAll('#vcardForm input, #vcardForm textarea, #vcardForm select');
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
        document.getElementById('downloadCard').addEventListener('click', () => {
            this.downloadDigitalCard();
        });

        // Digital business card actions
        const downloadCardBtn = document.getElementById('downloadCard');
        if (downloadCardBtn) {
            downloadCardBtn.addEventListener('click', async () => {
                // Try to generate PDF first, fallback to PNG if PDF fails
                const pdfSuccess = await this.generatePDFCard();
                if (!pdfSuccess) {
                    // Fallback to PNG download
                    this.downloadDigitalCard();
                }
            });
        }

        const downloadHQCardBtn = document.getElementById('downloadHQCard');
        if (downloadHQCardBtn) {
            downloadHQCardBtn.addEventListener('click', async () => {
                await this.downloadHighQualityCard();
            });
        }

        // Initialize digital card preview
        this.renderStylePreview();
        
        // Add form input listeners to update preview
        this.setupPreviewUpdateListeners();

        const shareCardBtn = document.getElementById('shareCard');
        if (shareCardBtn) {
            shareCardBtn.addEventListener('click', async () => {
                const dataUrl = await this.composeDigitalCard();
                if (!dataUrl) return;
                try {
                    if (navigator.canShare && navigator.canShare()) {
                        const blob = await (await fetch(dataUrl)).blob();
                        const file = new File([blob], 'digital-business-card.png', { type: 'image/png' });
                        await navigator.share({
                            title: 'My Digital Business Card',
                            text: 'Scan the QR to save my contact details.',
                            files: [file]
                        });
                    } else if (navigator.share) {
                        await navigator.share({
                            title: 'My Digital Business Card',
                            text: 'Scan the QR to save my contact details.',
                            url: dataUrl
                        });
                    } else {
                        if (navigator.clipboard) {
                            await navigator.clipboard.writeText(dataUrl);
                            showNotification('Card image link copied to clipboard', 'success');
                        } else {
                            showNotification('Sharing is not supported on this device', 'error');
                        }
                    }
                } catch (err) {
                    console.error('Share failed:', err);
                    showNotification('Share failed', 'error');
                }
            });
        }

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
        
        document.body.classList.remove('modal-open'); // when closing modal
    }

    setupFormValidation() {
        // Add custom validation for phone numbers
        const mobileInput = document.getElementById('mobile');
        mobileInput.addEventListener('input', (e) => {
            this.validatePhoneNumber(e.target);
        });

        // Add custom validation for work phone
        const workPhoneInput = document.getElementById('workPhone');
        if (workPhoneInput) {
            workPhoneInput.addEventListener('input', (e) => {
                this.validatePhoneNumber(e.target);
            });
        }

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
                alert('Camera is not supported in this browser. Please use a modern browser with camera support or try uploading a photo.');
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
            // iOS Safari requires play() to be called and playsinline is set in markup
            if (typeof video.play === 'function') {
                try { await video.play(); } catch (_) {}
            }
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                video.addEventListener('loadedmetadata', resolve, { once: true });
            });
            
            document.getElementById('cameraModal').style.display = 'block';
            document.getElementById('captureBtn').style.display = 'block';
            document.getElementById('retakeBtn').style.display = 'none';
            
            document.body.classList.add('modal-open');   // when opening modal
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            if (error.name === 'NotAllowedError') {
                alert('Camera access was denied. Please allow camera permissions in your browser settings or upload a photo instead.');
            } else if (error.name === 'NotFoundError') {
                alert('No camera found. Please connect a camera or upload a photo instead.');
            } else {
                alert('Unable to access camera. Please ensure permissions are granted or upload a photo instead.');
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
        const usePhotoBtn = document.getElementById('usePhotoBtn');
        if (usePhotoBtn) usePhotoBtn.style.display = 'block';
        
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
        const usePhotoBtn = document.getElementById('usePhotoBtn');
        if (usePhotoBtn) usePhotoBtn.style.display = 'none';
    }

    applyCapturedPhoto() {
        if (!this.capturedPhotoData) {
            alert('Please capture a photo first.');
            return;
        }
        
        // Show processing notification
        showNotification('Processing captured photo... Auto-cropping for perfect fit!', 'info');
        
        // Auto-crop the captured photo
        this.autoCropImage(this.capturedPhotoData, (croppedImage) => {
            this.profileImageData = croppedImage;
        this.updateProfilePreview();
            
        // Reveal camera/crop options after applying
        if (typeof this.showCameraOptions === 'function') {
            this.showCameraOptions();
        }
            
        // Close camera modal and stop stream
        const cameraModal = document.getElementById('cameraModal');
        if (cameraModal) cameraModal.style.display = 'none';
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        document.body.classList.remove('modal-open');
            
        // Reset buttons for next open
        document.getElementById('captureBtn').style.display = 'block';
        document.getElementById('retakeBtn').style.display = 'none';
        const usePhotoBtn = document.getElementById('usePhotoBtn');
        if (usePhotoBtn) usePhotoBtn.style.display = 'none';
        });
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
        
        document.body.classList.add('modal-open');   // when opening modal
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
            const croppedImageData = canvas.toDataURL('image/jpeg');
            
            // Show processing notification
            showNotification('Processing cropped image... Auto-cropping for perfect fit!', 'info');
            
            // Auto-crop the manually cropped image to fit digital card perfectly
            this.autoCropImage(croppedImageData, (finalCroppedImage) => {
                this.profileImageData = finalCroppedImage;
            
            // Update preview
            this.updateProfilePreview();
            this.closeCropModal();
                showNotification('Image auto-cropped and fitted perfectly!', 'success');
            });
        };
        img.src = cropImage.src;
    }

    closeCropModal() {
        document.getElementById('cropModal').style.display = 'none';
        document.body.classList.remove('modal-open'); // when closing modal
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
            // Show processing notification
            showNotification('Processing image... Auto-cropping for perfect fit!', 'info');
            
            // Auto-crop the image to fit the digital card perfectly
            this.autoCropImage(e.target.result, (croppedImage) => {
                this.profileImageData = croppedImage;
            this.updateProfilePreview();
            this.showCameraOptions();
                showNotification('Image auto-cropped and fitted perfectly!', 'success');
            });
        };
        reader.readAsDataURL(file);
    }

    // Auto-crop image to fit digital card dimensions (400x350 for image section)
    autoCropImage(imageData, callback) {
        const img = new Image();
        
        img.onerror = () => {
            showNotification('Error processing image. Please try again.', 'error');
            callback(imageData); // Fallback to original image
        };
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Digital card image section dimensions
                const targetWidth = 400;
                const targetHeight = 350; // 50% of 700px card height
                
                // Set canvas size to target dimensions
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                // Calculate scaling and positioning for perfect fit
                const imgAspectRatio = img.width / img.height;
                const targetAspectRatio = targetWidth / targetHeight;
                
                let sourceX = 0;
                let sourceY = 0;
                let sourceWidth = img.width;
                let sourceHeight = img.height;
                
                if (imgAspectRatio > targetAspectRatio) {
                    // Image is wider than target - crop horizontally
                    sourceHeight = img.height;
                    sourceWidth = img.height * targetAspectRatio;
                    sourceX = Math.max(0, (img.width - sourceWidth) / 2);
                } else {
                    // Image is taller than target - crop vertically
                    sourceWidth = img.width;
                    sourceHeight = img.width / targetAspectRatio;
                    sourceY = Math.max(0, (img.height - sourceHeight) / 2);
                }
                
                // Ensure source dimensions don't exceed image bounds
                sourceWidth = Math.min(sourceWidth, img.width - sourceX);
                sourceHeight = Math.min(sourceHeight, img.height - sourceY);
                
                // Draw the cropped and resized image
                ctx.drawImage(
                    img,
                    sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
                    0, 0, targetWidth, targetHeight // Destination rectangle
                );
                
                // Convert to data URL and callback
                const croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
                callback(croppedImageData);
                
            } catch (error) {
                console.error('Auto-crop error:', error);
                showNotification('Error during auto-crop. Using original image.', 'warning');
                callback(imageData); // Fallback to original image
            }
        };
        
        img.src = imageData;
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
            department: document.getElementById('department').value.trim(),
            mobile: document.getElementById('mobile').value.trim(),
            workPhone: document.getElementById('workPhone').value.trim(),
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
                    ${data.mobile ? `<div class="card-detail-item"><i class="fas fa-mobile-alt"></i><span>${data.mobile}</span></div>` : ''}
                    ${data.workPhone ? `<div class="card-detail-item"><i class="fas fa-phone"></i><span>${data.workPhone}</span></div>` : ''}
                    ${data.email ? `<div class="card-detail-item"><i class="fas fa-envelope"></i><span>${data.email}</span></div>` : ''}
                    ${data.website ? `<div class="card-detail-item"><i class="fas fa-globe"></i><span>${data.website}</span></div>` : ''}
                    ${data.address ? `<div class="card-detail-item"><i class="fas fa-map-marker-alt"></i><span>${data.address}</span></div>` : ''}
                </div>
                ${socialLinks ? `<div class="social-links">${socialLinks}</div>` : ''}
            </div>
        `;

        // Update digital business card preview
        this.updateDigitalCardPreview(data);
    }

    updateDigitalCardPreview(data) {
        // Update digital card elements
        const cardName = document.getElementById('cardName');
        const cardTitleDept = document.getElementById('cardTitleDept');
        const cardCompany = document.getElementById('cardCompany');
        const cardCompanyContact = document.getElementById('cardCompanyContact');
        const cardAddress = document.getElementById('cardAddress');
        const cardMobile = document.getElementById('cardMobile');
        const cardEmail = document.getElementById('cardEmail');
        const cardWebsite = document.getElementById('cardWebsite');
        const cardProfileImage = document.getElementById('cardProfileImage');
        const cardPlaceholder = document.getElementById('cardPlaceholder');

        if (cardName) {
            const fullName = `${data.firstName} ${data.lastName}`.trim();
            cardName.textContent = fullName || 'Your Name';
        }

        if (cardTitleDept) {
            // Create "Job Title - Department" display
            let titleDeptText = '';
            if (data.jobTitle && data.department) {
                titleDeptText = `${data.jobTitle} - ${data.department}`;
            } else if (data.jobTitle) {
                titleDeptText = data.jobTitle;
            } else if (data.department) {
                titleDeptText = data.department;
            } else {
                titleDeptText = 'Job Title - Department';
            }
            cardTitleDept.textContent = titleDeptText;
        }

        if (cardCompany) {
            cardCompany.textContent = data.company || 'Company Name';
        }

        // Update contact information visibility (remove company from contact list since it's now in header)
        if (cardCompanyContact) {
            cardCompanyContact.style.display = 'none';
        }

        if (cardAddress) {
            if (data.address) {
                cardAddress.style.display = 'flex';
                document.getElementById('cardAddressText').textContent = data.address;
            } else {
                cardAddress.style.display = 'none';
            }
        }

        if (cardMobile) {
            if (data.mobile) {
                cardMobile.style.display = 'flex';
                document.getElementById('cardMobileText').textContent = data.mobile;
            } else {
                cardMobile.style.display = 'none';
            }
        }

        if (cardEmail) {
            if (data.email) {
                cardEmail.style.display = 'flex';
                document.getElementById('cardEmailText').textContent = data.email;
            } else {
                cardEmail.style.display = 'none';
            }
        }

        if (cardWebsite) {
            if (data.website) {
                cardWebsite.style.display = 'flex';
                document.getElementById('cardWebsiteText').textContent = data.website;
            } else {
                cardWebsite.style.display = 'none';
            }
        }

        // Update profile image
        if (cardProfileImage && cardPlaceholder) {
            if (data.profileImage) {
                cardProfileImage.src = data.profileImage;
                cardProfileImage.style.display = 'block';
                cardPlaceholder.style.display = 'none';
            } else {
                cardProfileImage.style.display = 'none';
                cardPlaceholder.style.display = 'flex';
            }
        }

        // Update social media icons
        this.updateSocialMediaIcons(data);
    }

    updateSocialMediaIcons(data) {
        const socialIcons = {
            linkedin: { element: document.getElementById('cardLinkedIn'), url: data.linkedin },
            x: { element: document.getElementById('cardX'), url: data.x },
            facebook: { element: document.getElementById('cardFacebook'), url: data.facebook },
            instagram: { element: document.getElementById('cardInstagram'), url: data.instagram },
            youtube: { element: document.getElementById('cardYouTube'), url: data.youtube }
        };

        Object.entries(socialIcons).forEach(([platform, { element, url }]) => {
            if (element && url) {
                element.style.display = 'flex';
                element.href = url;
                element.title = `Visit ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
            } else if (element) {
                element.style.display = 'none';
            }
        });
    }

    updateDigitalCardQR(qrDataUrl) {
        const cardQROverlay = document.getElementById('cardQROverlay');
        if (cardQROverlay) {
            // Clear existing content
            cardQROverlay.innerHTML = '';
            
            // Create QR code image
            const qrImage = document.createElement('img');
            qrImage.src = qrDataUrl;
            qrImage.style.width = '100%';
            qrImage.style.height = '100%';
            qrImage.style.borderRadius = '8px';
            qrImage.alt = 'QR Code';
            
            cardQROverlay.appendChild(qrImage);
        }
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
        
        if (data.workPhone) {
            vcard += `TEL;TYPE=WORK:${data.workPhone}\n`;
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
        
        if (data.workPhone) {
            vcard += `TEL;TYPE=WORK:${data.workPhone}\n`;
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
            console.log('Styled QR library available:', typeof QRCodeStyling !== 'undefined');
            console.log('Container element found:', !!container);
            console.log('vCard data length:', vCardData.length);

            if (!container) {
                console.error('Container element not found');
                reject(new Error('Container element not found'));
                return;
            }

            if (!vCardData || vCardData.length < 10) {
                console.error('Invalid vCard data');
                reject(new Error('Invalid vCard data'));
                return;
            }

            // Try fancy styled QR first if library is available
            if (typeof QRCodeStyling !== 'undefined') {
                try {
                    container.innerHTML = '';

                    const usePremiumLogo = this.qrLogoData && this.isPremiumUser();

                    const styled = new QRCodeStyling({
                        type: 'canvas',
                        width: 512,
                        height: 512,
                        data: vCardData,
                        qrOptions: {
                            errorCorrectionLevel: 'H',
                            margin: 2
                        },
                        dotsOptions: {
                            type: 'rounded',
                            gradient: {
                                type: 'linear',
                                rotation: 0,
                                colorStops: [
                                    { offset: 0, color: '#667eea' },
                                    { offset: 1, color: '#764ba2' }
                                ]
                            }
                        },
                        backgroundOptions: {
                            color: '#ffffff'
                        },
                        cornersSquareOptions: {
                            type: 'extra-rounded',
                            color: '#667eea'
                        },
                        cornersDotOptions: {
                            type: 'dot',
                            color: '#764ba2'
                        },
                        image: usePremiumLogo ? this.qrLogoData : undefined,
                        imageOptions: usePremiumLogo ? {
                            hideBackgroundDots: true,
                            imageSize: 0.2,
                            margin: 4,
                            crossOrigin: 'anonymous'
                        } : undefined
                    });

                    // Get a canvas we can post-process and export as PNG
                    styled.getRawData('canvas')
                        .then((styledCanvas) => {
                            try {
                                const ctx = styledCanvas.getContext('2d');
                                // LinQ watermark removed - clean QR code

                                this.finishQRCodeGeneration(styledCanvas, container, resolve);
                            } catch (postErr) {
                                console.error('Post-processing styled QR failed, falling back:', postErr);
                                this._fallbackBasicQR(vCardData, container, resolve, reject);
                            }
                        })
                        .catch((err) => {
                            console.error('Styled QR getRawData failed, falling back:', err);
                            this._fallbackBasicQR(vCardData, container, resolve, reject);
                        });
                } catch (err) {
                    console.error('Styled QR creation failed, falling back:', err);
                    this._fallbackBasicQR(vCardData, container, resolve, reject);
                }
                return;
            }

            // Fallback to basic black/white QR
            if (typeof QRCode === 'undefined') {
                console.error('QRCode library is not loaded');
                reject(new Error('QRCode library is not loaded'));
                return;
            }

            this._fallbackBasicQR(vCardData, container, resolve, reject);
        });
    }

    _fallbackBasicQR(vCardData, container, resolve, reject) {
        try {
            console.log('Creating QR Code with fallback library...');
            console.log('vCard data size:', vCardData.length, 'characters');

            container.innerHTML = '';

            QRCode.toDataURL(vCardData, {
                errorCorrectionLevel: 'H',
                width: 512,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            }).then(dataUrl => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const qrImg = new Image();

                qrImg.onload = () => {
                    canvas.width = qrImg.width;
                    canvas.height = qrImg.height;
                    ctx.drawImage(qrImg, 0, 0);

                    if (this.qrLogoData && this.isPremiumUser()) {
                        const logoImg = new Image();
                        logoImg.onload = () => {
                            const logoSize = Math.min(qrImg.width, qrImg.height) * 0.15;
                            const logoX = (qrImg.width - logoSize) / 2;
                            const logoY = (qrImg.height - logoSize) / 2;

                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, 2 * Math.PI);
                            ctx.clip();
                            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
                            ctx.restore();

                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, 2 * Math.PI);
                            ctx.stroke();

                            this.finishQRCodeGeneration(canvas, container, resolve);
                        };
                        logoImg.src = this.qrLogoData;
                    } else {
                        const logoSize = Math.min(qrImg.width, qrImg.height) * 0.10;
                        const logoX = qrImg.width - logoSize - 10;
                        const logoY = qrImg.height - logoSize - 10;

                        // white rounded rectangle behind watermark
                        ctx.fillStyle = 'rgba(255,255,255,0.95)';
                        const pad = logoSize * 0.25;
                        const bgW = logoSize + pad * 2;
                        const bgH = logoSize * 0.75 + pad * 2;
                        const bgX = logoX - pad;
                        const bgY = logoY - pad;
                        ctx.save();
                        ctx.beginPath();
                        const radius = 8;
                        ctx.moveTo(bgX + radius, bgY);
                        ctx.arcTo(bgX + bgW, bgY, bgX + bgW, bgY + bgH, radius);
                        ctx.arcTo(bgX + bgW, bgY + bgH, bgX, bgY + bgH, radius);
                        ctx.arcTo(bgX, bgY + bgH, bgX, bgY, radius);
                        ctx.arcTo(bgX, bgY, bgX + bgW, bgY, radius);
                        ctx.closePath();
                        ctx.fill();
                        ctx.restore();

                        ctx.fillStyle = '#000000';
                        ctx.font = `bold ${logoSize * 0.5}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('LinQR', logoX + logoSize / 2, logoY + logoSize / 2);
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;

                        this.finishQRCodeGeneration(canvas, container, resolve);
                    }
                };

                qrImg.onerror = (error) => {
                    console.error('QR image failed to load:', error);
                    reject(new Error('Failed to load QR code image'));
                };

                qrImg.src = dataUrl;
            }).catch(error => {
                console.error('QR Code generation error:', error);

                if (error.message && (error.message.includes('too big') || error.message.includes('data'))) {
                    console.log('Data too large, trying without profile image...');
                    const data = this.getFormData();
                    const vCardDataWithoutPhoto = this.generateVCardDataWithoutPhoto(data);

                    QRCode.toDataURL(vCardDataWithoutPhoto, {
                        errorCorrectionLevel: 'H',
                        width: 512,
                        margin: 2,
                        color: { dark: '#000000', light: '#FFFFFF' }
                    }).then(dataUrl => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const qrImg = new Image();

                        qrImg.onload = () => {
                            canvas.width = qrImg.width;
                            canvas.height = qrImg.height;
                            ctx.drawImage(qrImg, 0, 0);

                            if (this.qrLogoData && this.isPremiumUser()) {
                        const logoImg = new Image();
                                logoImg.onload = () => {
                                    const logoSize = Math.min(qrImg.width, qrImg.height) * 0.15;
                                    const logoX = (qrImg.width - logoSize) / 2;
                                    const logoY = (qrImg.height - logoSize) / 2;

                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, 2 * Math.PI);
                                    ctx.clip();
                                    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
                                    ctx.restore();

                                    ctx.strokeStyle = '#ffffff';
                                    ctx.lineWidth = 3;
                                    ctx.beginPath();
                                    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, 2 * Math.PI);
                                    ctx.stroke();

                                    this.finishQRCodeGeneration(canvas, container, resolve);
                                };
                                logoImg.src = this.qrLogoData;
                            } else {
                                const logoSize = Math.min(qrImg.width, qrImg.height) * 0.10;
                                const logoX = qrImg.width - logoSize - 10;
                                const logoY = qrImg.height - logoSize - 10;

                                // white rounded rectangle behind watermark
                                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                                const pad = logoSize * 0.25;
                                const bgW = logoSize + pad * 2;
                                const bgH = logoSize * 0.75 + pad * 2;
                                const bgX = logoX - pad;
                                const bgY = logoY - pad;
                                ctx.save();
                                ctx.beginPath();
                                const radius = 8;
                                ctx.moveTo(bgX + radius, bgY);
                                ctx.arcTo(bgX + bgW, bgY, bgX + bgW, bgY + bgH, radius);
                                ctx.arcTo(bgX + bgW, bgY + bgH, bgX, bgY + bgH, radius);
                                ctx.arcTo(bgX, bgY + bgH, bgX, bgY, radius);
                                ctx.arcTo(bgX, bgY, bgX + bgW, bgY, radius);
                                ctx.closePath();
                                ctx.fill();
                                ctx.restore();

                                ctx.fillStyle = '#000000';
                                ctx.font = `bold ${logoSize * 0.5}px Arial`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText('LinQR', logoX + logoSize / 2, logoY + logoSize / 2);
                                ctx.shadowColor = 'transparent';
                                ctx.shadowBlur = 0;
                                ctx.shadowOffsetX = 0;
                                ctx.shadowOffsetY = 0;

                                this.finishQRCodeGeneration(canvas, container, resolve);
                            }
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
        } catch (e) {
            console.error('QR Code generation exception:', e);
            reject(e);
        }
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

    // Set up form input listeners to update preview
    setupPreviewUpdateListeners() {
        const formInputs = document.querySelectorAll('#vcardForm input, #vcardForm textarea, #vcardForm select');
        formInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.renderStylePreview();
                // Also update digital card preview
                const data = this.getFormData();
                this.updateDigitalCardPreview(data);
            });
            input.addEventListener('change', () => {
                this.renderStylePreview();
                // Also update digital card preview
                const data = this.getFormData();
                this.updateDigitalCardPreview(data);
            });
        });
    }

    // Render a small preview for the selected template using demo data
    renderStylePreview(templateValue) {
        const canvas = document.getElementById('cardStyleCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Get template theme (always template1)
        const theme = this.getTemplateTheme('template1');

        // Get form data for live preview
        const data = this.getFormData();

        // Professional Business Card Preview
        ctx.fillStyle = theme.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Profile photo area (reduced from 2/3 to 1/2 to make room for contact info)
        const profileHeight = Math.floor(height * 0.5);
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, profileHeight);

        // Profile image placeholder or actual image
        const avatarWidth = 80;
        const avatarHeight = 100;
        const ax = width / 2 - avatarWidth / 2;
        const ay = 40;
        
        if (data.profileImage) {
            // Draw actual profile image
            try {
                const img = new Image();
                img.onload = () => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(ax, ay, avatarWidth, avatarHeight);
                    ctx.clip();
                    ctx.drawImage(img, ax, ay, avatarWidth, avatarHeight);
                    ctx.restore();
                };
                img.src = data.profileImage;
            } catch (error) {
                ctx.fillStyle = theme.primaryColor;
                ctx.fillRect(ax, ay, avatarWidth, avatarHeight);
            }
        } else {
            ctx.fillStyle = theme.primaryColor;
            ctx.fillRect(ax, ay, avatarWidth, avatarHeight);
        }

        // Purple band
        ctx.fillStyle = theme.bandColor;
        ctx.fillRect(0, profileHeight, width, 25);

        // Name and title on purple band
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Segoe UI, Arial';
        const fullName = `${data.firstName || 'YOUR'} ${data.lastName || 'NAME'}`.trim();
        ctx.fillText(fullName.toUpperCase(), width / 2, profileHeight + 16);
        ctx.font = '12px Segoe UI, Arial';
        const jobTitle = data.jobTitle || 'PROFESSIONAL';
        ctx.fillText(jobTitle.toUpperCase(), width / 2, profileHeight + 30);

        // Contact info below
        let y = profileHeight + 45;
        ctx.textAlign = 'left';
        ctx.fillStyle = theme.textColor;
        ctx.font = '10px Segoe UI, Arial';
        
        if (data.mobile) {
            ctx.fillText(`📱 Mobile: ${data.mobile}`, 15, y);
            y += 11;
        }
        if (data.workPhone) {
            ctx.fillText(`☎️ Office: ${data.workPhone}`, 15, y);
            y += 11;
        }
        if (data.email) {
            ctx.fillText(`✉️ ${data.email}`, 15, y);
            y += 11;
        }
        if (data.website) {
            ctx.fillText(`🌐 ${data.website}`, 15, y);
            y += 11;
        }
        if (data.address) {
            let addressText = data.address;
            if (addressText.length > 20) {
                addressText = addressText.substring(0, 20) + '...';
            }
            ctx.fillText(`📍 ${addressText}`, 15, y);
            y += 11;
        }

        // Demo QR code on the right side
        const qrSize = 40;
        const qrX = width - qrSize - 15;
        const qrY = profileHeight + 20;
        ctx.fillStyle = '#000000';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX + 2, qrY + 2, qrSize - 4, qrSize - 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(qrX + 6, qrY + 6, qrSize - 12, qrSize - 12);
    }

        // Generate digital card based on selected template
    async generateDigitalCard() {
        try {
            // Check if QR code exists
        const qrContainer = document.getElementById('qrcode');
        const qrEl = qrContainer?.querySelector('img, canvas');
        if (!qrEl) {
            showNotification('Please generate the QR first', 'error');
            return null;
        }

            // Get the digital card preview element
            const digitalCardElement = document.querySelector('.digital-card');
            if (!digitalCardElement) {
                showNotification('Digital card preview not found', 'error');
                return null;
            }

            // Ensure the digital card is fully rendered and visible
            digitalCardElement.style.display = 'block';
            digitalCardElement.style.visibility = 'visible';
            
            // Wait a bit for any pending renders
            await new Promise(resolve => setTimeout(resolve, 100));

            // Use html2canvas to capture the actual HTML preview
            const canvas = await html2canvas(digitalCardElement, {
                backgroundColor: null, // Transparent background
                scale: 2, // Higher resolution for better quality
                useCORS: true, // Handle cross-origin images
                allowTaint: true, // Allow tainted canvas
                logging: false, // Disable logging
                width: digitalCardElement.offsetWidth,
                height: digitalCardElement.offsetHeight
            });

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            
            console.log('Digital card generated successfully using html2canvas');
            return dataUrl;
            
        } catch (error) {
            console.error('Error generating digital card:', error);
            showNotification('Failed to generate digital card', 'error');
            return null;
        }
    }

    _roundRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    async _elementToImage(el) {
        if (el instanceof HTMLImageElement) return el;
        if (el instanceof HTMLCanvasElement) {
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = el.toDataURL('image/png'); });
            return img;
        }
        throw new Error('Unsupported QR element');
    }

    _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
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
        
        if (data.workPhone) {
            vcard += `TEL;TYPE=WORK:${data.workPhone}\n`;
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

    // Download digital card as image
    async downloadDigitalCard() {
        try {
            const dataUrl = await this.generateDigitalCard();
            if (!dataUrl) {
                showNotification('Failed to generate digital card', 'error');
                return;
            }

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${this.getFormData().firstName}_${this.getFormData().lastName}_DigitalCard.png`;
            a.click();
            
            showNotification('Digital card downloaded successfully!', 'success');
        } catch (error) {
            console.error('Download failed:', error);
            showNotification('Download failed', 'error');
        }
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
    
    // Initialize app regardless of QRCode availability so uploads/features work
    try {
        window.vcardGenerator = new VCardGenerator();
    } catch (e) {
        console.error('Failed to initialize app:', e);
    }

    // Warn if QR library is missing (QR generation may fail later)
    if (typeof QRCode === 'undefined') {
        console.warn('QRCode library not loaded. You can still upload a photo and fill the form, but QR generation may fail.');
        if (typeof showNotification === 'function') {
            showNotification('QR library not loaded. Upload and preview work, but generating QR may fail.', 'info');
        }
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
        this.requires2FA = false;
        this.pendingUser = null;
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        // Check for existing session
        const token = localStorage.getItem('linqrius_token');
        if (token) {
            this.validateToken(token);
        }
        this.updateAuthUI();
    }

    async validateToken(token) {
        try {
            // In a real app, you'd validate the JWT token with the server
            // For now, we'll check if the token exists and is not expired
            const tokenData = this.parseJWT(token);
            if (tokenData && tokenData.exp > Date.now() / 1000) {
                this.currentUser = {
                    id: tokenData.userId,
                    email: tokenData.email
                };
                // Fetch user details from server
                await this.fetchUserDetails();
                return true;
            }
        } catch (error) {
            console.error('Token validation error:', error);
        }
        
        // Token invalid, clear it
        localStorage.removeItem('linqrius_token');
        this.currentUser = null;
        return false;
    }

    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
        }
    }

    async fetchUserDetails() {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('linqrius_token')}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.currentUser = { ...this.currentUser, ...userData };
                this.updateAuthUI();
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked;

        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store token
                localStorage.setItem('linqrius_token', data.token);
                
                // Set current user
                this.currentUser = data.user;
                
                // Update UI
                this.updateAuthUI();
                this.closeAuthModal();
                
                showNotification(`Welcome back, ${data.user.firstName}!`, 'success');
                
                // Check if 2FA is required
                if (data.user.twoFactorEnabled) {
                    this.requires2FA = true;
                    switchAuth('2fa-login');
                    // Send SMS code
                    const smsResult = await window.smsAuthService.sendSMS(data.user.phoneNumber);
                    if (smsResult.success) {
                        showNotification('SMS verification code sent to your phone', 'success');
                    }
                }
            } else {
                showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed. Please try again.', 'error');
        }
    }

    async handleSignup() {
        const firstName = document.getElementById('signupFirstName')?.value.trim();
        const lastName = document.getElementById('signupLastName')?.value.trim();
        const email = document.getElementById('signupEmail')?.value.trim();
        const phoneNumber = document.getElementById('signupPhone')?.value.trim();
        const password = document.getElementById('signupPassword')?.value;
        const confirmPassword = document.getElementById('signupConfirmPassword')?.value;
        const enable2FA = document.getElementById('enable2FA')?.checked;
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

        if (enable2FA && !phoneNumber) {
            showNotification('Phone number is required for 2FA', 'error');
            return;
        }

        if (!agreeTerms) {
            showNotification('Please agree to the Terms & Conditions', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password,
                    phoneNumber: enable2FA ? phoneNumber : undefined,
                    enable2FA
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (enable2FA && phoneNumber) {
                    // Store pending user data for 2FA verification
                    this.pendingUser = data.user;
                    this.requires2FA = true;
                    switchAuth('2fa-signup');
                    
                    // Send SMS verification code
                    const smsResult = await window.smsAuthService.sendSMS(phoneNumber);
                    if (smsResult.success) {
                        showNotification('SMS verification code sent to your phone', 'success');
                    } else {
                        showNotification('Failed to send SMS code', 'error');
                    }
                } else {
                    // Auto-login for users without 2FA
                    showNotification(`Welcome to LinQrius, ${firstName}!`, 'success');
                    switchAuth('login');
                }
            } else {
                showNotification(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('Registration failed. Please try again.', 'error');
        }
    }

    async handle2FASignup() {
        const code = document.getElementById('2faSignupCode')?.value.trim();
        
        if (!code) {
            showNotification('Please enter the verification code', 'error');
            return;
        }

        if (!this.pendingUser) {
            showNotification('No pending signup found', 'error');
            return;
        }

        const result = window.smsAuthService.verifyCode(this.pendingUser.phoneNumber, code);
        
        if (result.success) {
            // Complete registration with verified phone number
            this.currentUser = this.pendingUser;
            this.pendingUser = null;
            this.requires2FA = false;
            
            this.updateAuthUI();
            this.closeAuthModal();
            showNotification(`Welcome to LinQrius, ${this.currentUser.firstName}!`, 'success');
        } else {
            showNotification(result.message, 'error');
        }
    }

    async handle2FALogin() {
        const code = document.getElementById('2faLoginCode')?.value.trim();
        
        if (!code) {
            showNotification('Please enter the verification code', 'error');
            return;
        }

        if (!this.currentUser?.phoneNumber) {
            showNotification('No phone number found for 2FA', 'error');
            return;
        }

        const result = window.smsAuthService.verifyCode(this.currentUser.phoneNumber, code);
        
        if (result.success) {
            this.requires2FA = false;
            this.updateAuthUI();
            this.closeAuthModal();
            showNotification('2FA verification successful!', 'success');
        } else {
            showNotification(result.message, 'error');
        }
    }

    logout() {
        this.currentUser = null;
        this.requires2FA = false;
        this.pendingUser = null;
        localStorage.removeItem('linqrius_token');
        this.updateAuthUI();
        showNotification('Logged out successfully', 'success');
    }

    updateAuthUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'block';
                if (userName) userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            }
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        document.body.classList.remove('modal-open'); // when closing modal
    }

    // Premium plan management
    async upgradeToPremium(plan) {
        if (!this.currentUser) {
            showNotification('Please log in to upgrade your plan', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/subscription/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'sk-linqrius-2024-secure-key-12345'
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    plan
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Redirect to Stripe checkout
                window.location.href = data.checkoutUrl;
            } else {
                showNotification(data.error || 'Failed to create subscription', 'error');
            }
        } catch (error) {
            console.error('Premium upgrade error:', error);
            showNotification('Premium upgrade failed. Please try again.', 'error');
        }
    }

    // Check premium status
    async checkPremiumStatus() {
        if (!this.currentUser) return false;

        try {
            const response = await fetch(`${this.baseUrl}/api/user/premium-status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('linqrius_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.isPremium;
            }
        } catch (error) {
            console.error('Premium status check error:', error);
        }

        return false;
    }
}

// Global auth functions
function openAuthModal(type) {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'block';
        document.body.classList.add('modal-open'); // <-- Add this line
        switchAuth(type);
    }
}

function switchAuth(type) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    const twoFAForm = document.getElementById('twoFAForm');
    const twoFASignupForm = document.getElementById('twoFASignupForm');

    // Hide all forms
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (forgotForm) forgotForm.style.display = 'none';
    if (twoFAForm) twoFAForm.style.display = 'none';
    if (twoFASignupForm) twoFASignupForm.style.display = 'none';

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
        case '2fa':
            if (twoFAForm) twoFAForm.style.display = 'block';
            break;
        case '2fa-signup':
            if (twoFASignupForm) twoFASignupForm.style.display = 'block';
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

// 2FA resend code functions
function resend2FACode() {
    if (window.authSystem && window.authSystem.pendingUser) {
        window.smsAuthService.resendCode(window.authSystem.pendingUser.phoneNumber)
            .then(result => {
                if (result.success) {
                    showNotification('New verification code sent!', 'success');
                } else {
                    showNotification(result.message, 'error');
                }
            });
    }
}

function resend2FASignupCode() {
    if (window.authSystem && window.authSystem.pendingUser) {
        window.smsAuthService.resendCode(window.authSystem.pendingUser.phoneNumber)
            .then(result => {
                if (result.success) {
                    showNotification('New verification code sent!', 'success');
                } else {
                    showNotification(result.message, 'error');
                }
            });
    }
}

// Initialize auth system
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();

    // Wire up auth form submissions to AuthSystem
    const loginFormEl = document.getElementById('loginFormSubmit');
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            if (window.authSystem) window.authSystem.handleLogin();
        });
    }

    const signupFormEl = document.getElementById('signupFormSubmit');
    if (signupFormEl) {
        signupFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            if (window.authSystem) window.authSystem.handleSignup();
        });
    }

    const twoFAFormEl = document.querySelector('#twoFAForm form');
    if (twoFAFormEl) {
        twoFAFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            if (window.authSystem) window.authSystem.handle2FALogin();
        });
    }

    const twoFASignupFormEl = document.querySelector('#twoFASignupForm form');
    if (twoFASignupFormEl) {
        twoFASignupFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            if (window.authSystem) window.authSystem.handle2FASignup();
        });
    }
});


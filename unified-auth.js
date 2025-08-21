// Unified Authentication System for LinQrius - Works on All Pages
// This file centralizes all authentication logic so changes only need to be made in one place

class UnifiedAuthSystem {
    constructor() {
        this.currentUser = null;
        this.verificationData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
        this.updateUIForCurrentUser();
    }

    setupEventListeners() {
        // Close modal when clicking outside or on close button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAuthModal();
            }
        });

        // Close button
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeAuthModal());
        }

        // Password strength checker
        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        }

        // Setup form submissions
        this.setupFormSubmissions();
    }

    setupFormSubmissions() {
        // Registration form
        const registerForm = document.getElementById('signupFormSubmit');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegistration(e));
        }

        // Login form
        const loginForm = document.getElementById('loginFormSubmit');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgotPasswordFormSubmit');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }
    }

    // Check existing session
    checkExistingSession() {
        const savedUser = localStorage.getItem('linqrius_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.updateUIForLoggedInUser();
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('linqrius_user');
            }
        }
    }

    // Save user session
    saveUserSession(user) {
        localStorage.setItem('linqrius_user', JSON.stringify(user));
    }

    // Update UI for logged in user
    updateUIForLoggedInUser() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.email || 'User';
        }
    }

    // Update UI for current user (called during init)
    updateUIForCurrentUser() {
        if (this.currentUser) {
            this.updateUIForLoggedInUser();
        } else {
            this.updateUIForLoggedOutUser();
        }
    }

    // Update UI for logged out user
    updateUIForLoggedOutUser() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');

        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }

    async handleRegistration(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const userData = {
            firstName: document.getElementById('signupFirstName')?.value || '',
            lastName: document.getElementById('signupLastName')?.value || '',
            email: document.getElementById('signupEmail')?.value || '',
            password: document.getElementById('signupPassword')?.value || '',
            phoneNumber: document.getElementById('signupPhone')?.value || '',
            enable2FA: document.getElementById('enable2FA')?.checked || false
        };

        if (!userData.email || !userData.password) {
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            this.showLoading('Creating your account...');
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.showSuccess('Account created successfully! Please sign in.');
                this.switchAuthForm('loginForm');
            } else {
                this.showError(result.error || 'Registration failed');
            }
        } catch (error) {
            this.hideLoading();
            this.showError('Registration failed. Please try again.');
            console.error('Registration error:', error);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail')?.value || '';
        const password = document.getElementById('loginPassword')?.value || '';

        if (!email || !password) {
            this.showError('Please enter both email and password');
            return;
        }

        try {
            this.showLoading('Signing you in...');
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.currentUser = result.user;
                this.saveUserSession(result.user);
                this.updateUIForLoggedInUser();
                this.closeAuthModal();
                this.showSuccess('Welcome back!');
            } else {
                this.showError(result.error || 'Login failed');
            }
        } catch (error) {
            this.hideLoading();
            this.showError('Login failed. Please try again.');
            console.error('Login error:', error);
        }
    }

    // Handle login from inline form handlers (for Link Shortener page)
    async handleLoginFromInline(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail')?.value || '';
        const password = document.getElementById('loginPassword')?.value || '';

        if (!email || !password) {
            alert('Please fill in both email and password');
            return;
        }

        try {
            // Show loading message
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            submitBtn.disabled = true;
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.currentUser = result.user;
                this.saveUserSession(result.user);
                this.updateUIForLoggedInUser();
                this.closeAuthModal();
                alert('Welcome back!');
            } else {
                alert(result.error || 'Login failed');
            }
        } catch (error) {
            alert('Login failed. Please try again.');
            console.error('Login error:', error);
        } finally {
            // Restore button
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('forgotEmail')?.value || '';
        
        if (!email) {
            this.showError('Please enter your email address');
            return;
        }

        try {
            this.showLoading('Sending reset link...');
            
            // For now, just show a message since the endpoint might not be implemented
            this.hideLoading();
            this.showInfo('Password reset functionality will be available soon. Please contact support.');
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to send reset link. Please try again.');
            console.error('Forgot password error:', error);
        }
    }

    // Check existing session
    checkExistingSession() {
        const savedUser = localStorage.getItem('linqrius_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.updateUIForLoggedInUser();
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('linqrius_user');
            }
        }
    }

    // Save user session
    saveUserSession(user) {
        localStorage.setItem('linqrius_user', JSON.stringify(user));
    }

    // Update UI for logged in user
    updateUIForLoggedInUser() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.email || 'User';
        }
    }

    // Update UI for logged out user
    updateUIForLoggedOutUser() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');

        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }

    // Modal management
    openAuthModal(type = 'signup') {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'block';
            this.switchAuthForm(type === 'signup' ? 'signupForm' : 'loginForm');
        }
    }

    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Switch between auth forms
    switchAuthForm(formId) {
        const forms = ['emailForm', 'emailSentForm', 'passwordForm', 'loginForm', 'signupForm', 'forgotPasswordForm'];
        forms.forEach(form => {
            const element = document.getElementById(form);
            if (element) {
                element.style.display = form === formId ? 'block' : 'none';
            }
        });
    }

    // Password strength checker
    checkPasswordStrength(password) {
        const strengthElement = document.getElementById('passwordStrength');
        if (!strengthElement) return;

        let strength = 0;
        let feedback = '';

        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        switch (strength) {
            case 0:
            case 1:
                feedback = 'Very Weak';
                strengthElement.className = 'password-strength very-weak';
                break;
            case 2:
                feedback = 'Weak';
                strengthElement.className = 'password-strength weak';
                break;
            case 3:
                feedback = 'Fair';
                strengthElement.className = 'password-strength fair';
                break;
            case 4:
                feedback = 'Good';
                strengthElement.className = 'password-strength good';
                break;
            case 5:
                feedback = 'Strong';
                strengthElement.className = 'password-strength strong';
                break;
        }

        strengthElement.textContent = feedback;
    }

    // Logout
    logout() {
        this.currentUser = null;
        localStorage.removeItem('linqrius_user');
        this.updateUIForLoggedOutUser();
        this.showSuccess('Logged out successfully');
    }

    // Notification methods
    showLoading(message) {
        const loading = document.createElement('div');
        loading.id = 'authLoading';
        loading.className = 'auth-loading';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        document.body.appendChild(loading);
    }

    hideLoading() {
        const loading = document.getElementById('authLoading');
        if (loading) {
            loading.remove();
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `auth-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Keep info notifications longer
        const duration = type === 'info' ? 8000 : 3000;
        
        setTimeout(() => {
            notification.remove();
        }, duration);
    }
}

// Global functions for HTML onclick handlers
function openAuthModal(type) {
    if (window.unifiedAuth) {
        window.unifiedAuth.openAuthModal(type);
    }
}

function switchAuth(type) {
    if (window.unifiedAuth) {
        window.unifiedAuth.switchAuthForm(type + 'Form');
    }
}

function openForgotPassword() {
    if (window.unifiedAuth) {
        window.unifiedAuth.switchAuthForm('forgotPasswordForm');
    }
}

function logout() {
    if (window.unifiedAuth) {
        window.unifiedAuth.logout();
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

// Initialize unified auth system when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Initializing Unified Auth System...');
    try {
        window.unifiedAuth = new UnifiedAuthSystem();
        console.log('✅ Unified Authentication System initialized successfully');
        console.log('🔐 Auth system available at:', window.unifiedAuth);
        
        // Test if auth buttons exist
        const authButtons = document.getElementById('authButtons');
        if (authButtons) {
            console.log('✅ Auth buttons found in unified auth init');
        } else {
            console.log('❌ Auth buttons not found in unified auth init');
        }
    } catch (error) {
        console.error('❌ Failed to initialize Unified Auth System:', error);
    }
});

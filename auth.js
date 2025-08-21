// Email-Based Authentication System for LinQrius Link Shortener with Supabase
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.verificationData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
        this.checkEmailVerification();
        this.setupSupabaseAuthListener();
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
    }

    // Setup Supabase auth state listener
    setupSupabaseAuthListener() {
        if (window.SupabaseAuth) {
            window.SupabaseAuth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event, session);
                
                if (event === 'SIGNED_IN' && session) {
                    // Check if user is verified
                    if (session.user.email_confirmed_at) {
                        this.currentUser = session.user;
                        this.saveUserSession(session.user);
                        this.updateUIForLoggedInUser();
                        this.closeAuthModal();
                        this.showSuccess('Welcome to LinQrius!');
                    } else {
                        // User is not verified, sign them out
                        window.SupabaseAuth.signOut();
                        this.showError('Please verify your email before signing in. Check your inbox for the verification link.');
                    }
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.logout();
                }
            });
        }
    }

    // Check if user is coming back from email verification
    checkEmailVerification() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const email = urlParams.get('email');
        const token = urlParams.get('token');
        const type = urlParams.get('type');
        const verified = urlParams.get('verified');
        
        // Debug: Log all URL parameters
        console.log('URL Parameters:', {
            action,
            email,
            token,
            type,
            verified,
            allParams: Object.fromEntries(urlParams.entries())
        });
        
        // Check for Supabase email verification completion
        if (verified === 'true') {
            // User completed email verification via Supabase
            console.log('Supabase verification completed:', { verified });
            this.showVerificationPage('your email');
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
        } else if (token && (type === 'signup' || type === 'recovery' || type === 'invite')) {
            // User clicked email verification link from Supabase
            const userEmail = email || 'your email';
            console.log('Supabase verification detected:', { token, type, email: userEmail });
            this.showVerificationPage(userEmail);
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
        } else if (action === 'verify' && email) {
            // User clicked custom verification link
            console.log('Custom verification detected:', { action, email });
            this.showVerificationPage(email);
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
        } else if (action === 'reset' && email) {
            // User clicked password reset link
            console.log('Password reset detected:', { action, email });
            this.showPasswordResetPage(email);
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (token) {
            // Fallback: any token parameter should trigger verification
            console.log('Fallback verification detected:', { token });
            this.showVerificationPage('your email');
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Show verification page
    showVerificationPage(email) {
        // Create verification page HTML
        const verificationHTML = `
            <div class="verification-page" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div class="verification-content" style="
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                ">
                    <div class="verification-icon" style="
                        font-size: 64px;
                        margin-bottom: 20px;
                    ">✅</div>
                    
                    <h2 style="
                        color: #1f2937;
                        margin-bottom: 16px;
                        font-size: 24px;
                    ">Email Verification</h2>
                    
                    <p style="
                        color: #6b7280;
                        margin-bottom: 24px;
                        line-height: 1.6;
                    ">We're verifying your email address: <strong>${email}</strong></p>
                    
                    <div class="verification-status" style="
                        background: #f3f4f6;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 24px;
                    ">
                        <div class="loading-spinner" style="
                            width: 40px;
                            height: 40px;
                            border: 4px solid #e5e7eb;
                            border-top: 4px solid #3b82f6;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 16px;
                        "></div>
                        <p style="margin: 0; color: #6b7280;">Verifying your email...</p>
                    </div>
                    
                    <button onclick="window.authSystem.completeVerification('${email}')" style="
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: background 0.3s;
                    " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                        Complete Verification
                    </button>
                    
                    <p style="
                        color: #9ca3af;
                        font-size: 14px;
                        margin-top: 16px;
                    ">This page will automatically redirect in <span id="countdown">5</span> seconds</p>
                </div>
            </div>
            
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', verificationHTML);
        
        // Start countdown
        this.startVerificationCountdown();
    }

    // Show password reset page
    showPasswordResetPage(email) {
        const resetHTML = `
            <div class="reset-page" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div class="reset-content" style="
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    text-align: center;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                ">
                    <div class="reset-icon" style="
                        font-size: 64px;
                        margin-bottom: 20px;
                    ">🔐</div>
                    
                    <h2 style="
                        color: #1f2937;
                        margin-bottom: 16px;
                        font-size: 24px;
                    ">Password Reset</h2>
                    
                    <p style="
                        color: #6b7280;
                        margin-bottom: 24px;
                        line-height: 1.6;
                    ">You can now reset your password for: <strong>${email}</strong></p>
                    
                    <button onclick="window.authSystem.openPasswordReset()" style="
                        background: #ef4444;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: background 0.3s;
                        margin-right: 12px;
                    " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                        Reset Password
                    </button>
                    
                    <button onclick="window.authSystem.closeResetPage()" style="
                        background: #6b7280;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: background 0.3s;
                    " onmouseover="this.style.background='#4b5563'" onmouseout="this.style.background='#6b7280'">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', resetHTML);
    }

    // Close reset page
    closeResetPage() {
        const resetPage = document.querySelector('.reset-page');
        if (resetPage) {
            resetPage.remove();
        }
    }

    // Open password reset form
    openPasswordReset() {
        this.closeResetPage();
        this.openAuthModal('forgotPassword');
    }

    // Start verification countdown
    startVerificationCountdown() {
        let countdown = 5;
        const countdownElement = document.getElementById('countdown');
        
        const timer = setInterval(() => {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(timer);
                this.completeVerification();
            }
        }, 1000);
    }

    // Complete verification
    async completeVerification(email = null) {
        try {
            // Remove verification page
            const verificationPage = document.querySelector('.verification-page');
            if (verificationPage) {
                verificationPage.remove();
            }

            // Show success message
            this.showSuccess('Email verified successfully! You can now sign in with your account.');
            
            // Auto-open login form after 2 seconds
            setTimeout(() => {
                this.openAuthModal('login');
            }, 2000);
            
        } catch (error) {
            console.error('Verification completion error:', error);
            this.showError('Verification completed, but there was an issue. Please try logging in.');
        }
    }

    // Email submission for verification
    async handleEmailSubmit(event) {
        event.preventDefault();
        
        const email = document.getElementById('emailAddress').value;
        
        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return false;
        }

        try {
            this.showLoading('Sending verification email...');
            
            // Use Supabase to send verification email
            if (window.SupabaseAuth) {
                const result = await window.SupabaseAuth.signUp(email, 'temporary_password');
                
                if (result.success) {
                    this.hideLoading();
                    this.verificationData = { email, timestamp: Date.now() };
                    this.switchAuthForm('emailSent');
                    this.showSuccess('Verification email sent! Check your inbox and click the verification link.');
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('Supabase not loaded');
            }
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to send verification email. Please try again.');
            console.error('Email send error:', error);
        }

        return false;
    }

    // Password creation after email verification
    async handlePasswordSubmit(event) {
        event.preventDefault();
        
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return false;
        }

        if (password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return false;
        }

        try {
            this.showLoading('Creating account...');
            
            // Get email from verification data
            const email = this.verificationData?.email;
            
            if (!email) {
                throw new Error('No email found for verification');
            }

            // Use Supabase to create account with the actual password
            if (window.SupabaseAuth) {
                const result = await window.SupabaseAuth.signUp(email, password);
                
                if (result.success) {
                    this.hideLoading();
                    this.showSuccess('Account created successfully! Please check your email to verify your account.');
                    this.closeAuthModal();
                    
                    // Show a message to check email
                    setTimeout(() => {
                        this.showNotification('Please check your email and click the verification link to complete your registration.', 'info');
                    }, 2000);
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('Supabase not loaded');
            }
            
        } catch (error) {
            this.hideLoading();
            this.showError('Account creation failed. Please try again.');
            console.error('Account creation error:', error);
        }

        return false;
    }

    // User login
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return false;
        }

        try {
            this.showLoading('Signing in...');
            
            // Use Supabase to sign in
            if (window.SupabaseAuth) {
                const result = await window.SupabaseAuth.signIn(email, password);
                
                if (result.success) {
                    this.hideLoading();
                    this.currentUser = result.data.user;
                    this.saveUserSession(result.data.user);
                    this.updateUIForLoggedInUser();
                    this.closeAuthModal();
                    this.showSuccess('Welcome back!');
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('Supabase not loaded');
            }
            
        } catch (error) {
            this.hideLoading();
            this.showError('Invalid email or password');
            console.error('Login error:', error);
        }

        return false;
    }

    // Forgot password
    async handleForgotPassword(event) {
        event.preventDefault();
        
        const email = document.getElementById('forgotEmail').value;

        if (!this.validateEmail(email)) {
            this.showError('Please enter a valid email address');
            return false;
        }

        try {
            this.showLoading('Sending reset link...');
            
            // Use Supabase to reset password
            if (window.SupabaseAuth) {
                const result = await window.SupabaseAuth.resetPassword(email);
                
                if (result.success) {
                    this.hideLoading();
                    this.showSuccess('Password reset link sent to your email!');
                    this.closeAuthModal();
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('Supabase not loaded');
            }
            
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to send reset link. Please try again.');
            console.error('Reset email error:', error);
        }

        return false;
    }

    // Utility methods
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

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

        if (strength < 3) {
            feedback = 'Weak password';
            strengthElement.className = 'password-strength weak';
        } else if (strength < 5) {
            feedback = 'Medium strength password';
            strengthElement.className = 'password-strength medium';
        } else {
            feedback = 'Strong password';
            strengthElement.className = 'password-strength strong';
        }

        strengthElement.textContent = feedback;
    }

    // Form switching
    switchAuthForm(formName) {
        const forms = ['emailForm', 'emailSentForm', 'passwordForm', 'loginForm', 'signupForm', 'forgotPasswordForm'];
        
        forms.forEach(form => {
            const element = document.getElementById(form);
            if (element) {
                element.style.display = form === formName ? 'block' : 'none';
            }
        });

        // Update email display for email sent form
        if (formName === 'emailSentForm' && this.verificationData) {
            const emailDisplay = document.getElementById('emailDisplay');
            if (emailDisplay) {
                emailDisplay.textContent = this.verificationData.email;
            }
        }
    }

    // Session management
    saveUserSession(user) {
        localStorage.setItem('linqrius_user', JSON.stringify(user));
    }

    checkExistingSession() {
        // Check Supabase session first
        if (window.SupabaseAuth) {
            window.SupabaseAuth.getSession().then(result => {
                if (result.success && result.session) {
                    this.currentUser = result.session.user;
                    this.updateUIForLoggedInUser();
                }
            });
        }

        // Fallback to localStorage
        const savedUser = localStorage.getItem('linqrius_user');
        if (savedUser && !this.currentUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.updateUIForLoggedInUser();
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('linqrius_user');
            }
        }
    }

    async logout() {
        try {
            if (window.SupabaseAuth) {
                await window.SupabaseAuth.signOut();
            }
        } catch (error) {
            console.error('Supabase logout error:', error);
        }

        this.currentUser = null;
        localStorage.removeItem('linqrius_user');
        this.updateUIForLoggedOutUser();
        this.showSuccess('Logged out successfully');
    }

    // UI updates
    updateUIForLoggedInUser() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.email;
        }
    }

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
    if (window.authSystem) {
        window.authSystem.openAuthModal(type);
    }
}

function switchAuth(type) {
    if (window.authSystem) {
        window.authSystem.switchAuthForm(type + 'Form');
    }
}

function openForgotPassword() {
    if (window.authSystem) {
        window.authSystem.switchAuthForm('forgotPasswordForm');
    }
}

function resendVerificationEmail() {
    if (window.authSystem && window.authSystem.verificationData) {
        window.authSystem.handleEmailSubmit({ preventDefault: () => {} });
        window.authSystem.showSuccess('Verification email resent!');
    }
}

function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    }
}

// Initialize auth system when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Supabase to load
    const checkSupabase = () => {
        if (window.SupabaseAuth) {
            window.authSystem = new AuthSystem();
            console.log('Auth system initialized with Supabase!');
        } else {
            setTimeout(checkSupabase, 100);
        }
    };
    
    checkSupabase();
});

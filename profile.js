// Profile Page JavaScript
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.initializeProfile();
    }

    initializeProfile() {
        // Check if user is logged in
        const savedUser = localStorage.getItem('linqrius_user') || sessionStorage.getItem('linqrius_user');
        if (!savedUser) {
            // Redirect to home if not logged in
            window.location.href = 'index.html';
            return;
        }

        this.currentUser = JSON.parse(savedUser);
        this.loadUserData();
        this.initializeEventListeners();
    }

    loadUserData() {
        // Update profile header
        document.getElementById('profileDisplayName').textContent = 
            `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        document.getElementById('profileEmail').textContent = this.currentUser.email;
        document.getElementById('userName').textContent = this.currentUser.firstName;

        // Load profile picture if exists
        if (this.currentUser.avatar) {
            const avatarCircle = document.getElementById('avatarCircle');
            avatarCircle.innerHTML = `<img src="${this.currentUser.avatar}" alt="Profile Picture">`;
        }

        // Load form data
        document.getElementById('firstName').value = this.currentUser.firstName || '';
        document.getElementById('lastName').value = this.currentUser.lastName || '';
        document.getElementById('email').value = this.currentUser.email || '';
        document.getElementById('phone').value = this.currentUser.phone || '';
        document.getElementById('company').value = this.currentUser.company || '';
        document.getElementById('bio').value = this.currentUser.bio || '';

        // Load preferences
        document.getElementById('emailNotifications').checked = this.currentUser.emailNotifications !== false;
        document.getElementById('marketingEmails').checked = this.currentUser.marketingEmails === true;
        document.getElementById('analytics').checked = this.currentUser.analytics !== false;

        // Update plan info
        this.updatePlanInfo();
    }

    updatePlanInfo() {
        const plan = this.currentUser.plan || 'free';
        const planNames = {
            'free': 'Free Plan',
            'pro': 'Pro Plan',
            'ultra': 'Ultra Pro Plan',
            'enterprise': 'Enterprise Plan'
        };
        
        const planPrices = {
            'free': '$0.00/month',
            'pro': '$4.99/month',
            'ultra': '$11.99/month',
            'enterprise': '$19.99/month'
        };

        document.getElementById('currentPlanName').textContent = planNames[plan];
        document.getElementById('currentPlanPrice').textContent = planPrices[plan];
        document.getElementById('profilePlan').textContent = planNames[plan];
        
        if (plan === 'free') {
            document.getElementById('profilePlan').className = 'profile-badge free';
        } else {
            document.getElementById('profilePlan').className = 'profile-badge premium';
        }
    }

    initializeEventListeners() {
        // Personal info form
        document.getElementById('personalInfoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePersonalInfo();
        });

        // Password form
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Avatar upload
        document.getElementById('avatarInput').addEventListener('change', (e) => {
            this.handleAvatarUpload(e);
        });

        // Preferences
        const preferences = ['emailNotifications', 'marketingEmails', 'analytics'];
        preferences.forEach(pref => {
            document.getElementById(pref).addEventListener('change', () => {
                this.savePreferences();
            });
        });
    }

    savePersonalInfo() {
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            company: document.getElementById('company').value.trim(),
            bio: document.getElementById('bio').value.trim()
        };

        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Update current user
        Object.assign(this.currentUser, formData);

        // Save to storage
        const storageKey = localStorage.getItem('linqrius_user') ? 'localStorage' : 'sessionStorage';
        if (storageKey === 'localStorage') {
            localStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
        } else {
            sessionStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
        }

        // Update users database
        const users = JSON.parse(localStorage.getItem('linqrius_users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...formData };
            localStorage.setItem('linqrius_users', JSON.stringify(users));
        }

        // Update display
        this.loadUserData();
        showNotification('Profile updated successfully!', 'success');
    }

    changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate
        if (!currentPassword || !newPassword || !confirmPassword) {
            showNotification('Please fill in all password fields', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotification('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 8) {
            showNotification('Password must be at least 8 characters long', 'error');
            return;
        }

        // Check current password (in production, this would be server-side)
        const users = JSON.parse(localStorage.getItem('linqrius_users') || '[]');
        const user = users.find(u => u.id === this.currentUser.id);
        if (!user || user.password !== currentPassword) {
            showNotification('Current password is incorrect', 'error');
            return;
        }

        // Update password
        user.password = newPassword;
        localStorage.setItem('linqrius_users', JSON.stringify(users));

        // Clear form
        document.getElementById('passwordForm').reset();
        showNotification('Password updated successfully!', 'success');
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            showNotification('Image must be less than 2MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            
            // Update display
            const avatarCircle = document.getElementById('avatarCircle');
            avatarCircle.innerHTML = `<img src="${dataUrl}" alt="Profile Picture">`;
            
            // Save to user data
            this.currentUser.avatar = dataUrl;
            
            // Save to storage
            const storageKey = localStorage.getItem('linqrius_user') ? 'localStorage' : 'sessionStorage';
            if (storageKey === 'localStorage') {
                localStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
            } else {
                sessionStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
            }

            // Update users database
            const users = JSON.parse(localStorage.getItem('linqrius_users') || '[]');
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                users[userIndex].avatar = dataUrl;
                localStorage.setItem('linqrius_users', JSON.stringify(users));
            }

            showNotification('Profile picture updated!', 'success');
        };
        reader.readAsDataURL(file);
    }

    savePreferences() {
        const preferences = {
            emailNotifications: document.getElementById('emailNotifications').checked,
            marketingEmails: document.getElementById('marketingEmails').checked,
            analytics: document.getElementById('analytics').checked
        };

        // Update current user
        Object.assign(this.currentUser, preferences);

        // Save to storage
        const storageKey = localStorage.getItem('linqrius_user') ? 'localStorage' : 'sessionStorage';
        if (storageKey === 'localStorage') {
            localStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
        } else {
            sessionStorage.setItem('linqrius_user', JSON.stringify(this.currentUser));
        }

        // Update users database
        const users = JSON.parse(localStorage.getItem('linqrius_users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            Object.assign(users[userIndex], preferences);
            localStorage.setItem('linqrius_users', JSON.stringify(users));
        }

        showNotification('Preferences saved!', 'success');
    }
}

// Tab switching
function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Avatar functions
function changeAvatar() {
    document.getElementById('avatarInput').click();
}

// Security functions
function enable2FA(type) {
    showNotification(`Two-factor authentication via ${type === 'sms' ? 'SMS' : 'Authenticator App'} coming soon!`, 'info');
}

// Billing functions
function showUpgradeModal() {
    showNotification('Upgrade plans coming soon! Stay tuned for premium features.', 'info');
}

function addPaymentMethod() {
    showNotification('Payment method management coming soon!', 'info');
}

// Data functions
function exportData() {
    const user = JSON.parse(localStorage.getItem('linqrius_user') || sessionStorage.getItem('linqrius_user'));
    if (!user) return;

    const dataToExport = {
        profile: user,
        stores: JSON.parse(localStorage.getItem('cliqart_stores') || '[]').filter(store => store.userId === user.id),
        links: JSON.parse(localStorage.getItem('linqrius_links') || '[]').filter(link => link.userId === user.id),
        exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `linqrius-data-${user.firstName}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('Data exported successfully!', 'success');
}

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        if (confirm('This will permanently delete all your data including stores, links, and profile information. Are you absolutely sure?')) {
            // Remove user from users database
            const users = JSON.parse(localStorage.getItem('linqrius_users') || '[]');
            const user = JSON.parse(localStorage.getItem('linqrius_user') || sessionStorage.getItem('linqrius_user'));
            const updatedUsers = users.filter(u => u.id !== user.id);
            localStorage.setItem('linqrius_users', JSON.stringify(updatedUsers));

            // Clear user session
            localStorage.removeItem('linqrius_user');
            sessionStorage.removeItem('linqrius_user');

            // Clear user data
            const stores = JSON.parse(localStorage.getItem('cliqart_stores') || '[]');
            const filteredStores = stores.filter(store => store.userId !== user.id);
            localStorage.setItem('cliqart_stores', JSON.stringify(filteredStores));

            showNotification('Account deleted successfully. Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }
}

// User dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

// Logout
function logout() {
    if (window.authSystem) {
        window.authSystem.logout();
    }
    window.location.href = 'index.html';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-dropdown')) {
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) dropdown.style.display = 'none';
        }
    });
});

// SMS Authentication Service for LinQrius
class SMSAuthService {
    constructor() {
        this.verificationCodes = new Map(); // phone -> {code, expiresAt}
        this.maxAttempts = 3;
        this.attempts = new Map(); // phone -> attempts count
    }

    // Generate 6-digit verification code
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Send SMS verification code (simulated)
    async sendSMS(phoneNumber) {
        const code = this.generateCode();
        const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

        this.verificationCodes.set(phoneNumber, {
            code,
            expiresAt,
            attempts: 0
        });

        // Simulate SMS sending
        console.log(`📱 SMS sent to ${phoneNumber}: Your verification code is ${code}`);
        
        // In production, integrate with Twilio, AWS SNS, etc.
        return {
            success: true,
            message: 'Verification code sent to your phone',
            expiresIn: '5 minutes'
        };
    }

    // Verify SMS code
    verifyCode(phoneNumber, code) {
        const verification = this.verificationCodes.get(phoneNumber);
        
        if (!verification) {
            return { success: false, message: 'No verification code found. Please request a new one.' };
        }

        if (Date.now() > verification.expiresAt) {
            this.verificationCodes.delete(phoneNumber);
            return { success: false, message: 'Verification code expired. Please request a new one.' };
        }

        if (verification.attempts >= this.maxAttempts) {
            this.verificationCodes.delete(phoneNumber);
            return { success: false, message: 'Too many attempts. Please request a new code.' };
        }

        if (verification.code === code) {
            this.verificationCodes.delete(phoneNumber);
            return { success: true, message: 'Phone number verified successfully!' };
        } else {
            verification.attempts++;
            return { success: false, message: `Invalid code. ${this.maxAttempts - verification.attempts} attempts remaining.` };
        }
    }

    // Check if phone is verified
    isPhoneVerified(phoneNumber) {
        return !this.verificationCodes.has(phoneNumber);
    }

    // Resend verification code
    async resendCode(phoneNumber) {
        const existing = this.verificationCodes.get(phoneNumber);
        if (existing && Date.now() < existing.expiresAt) {
            return { success: false, message: 'Please wait before requesting a new code.' };
        }
        return await this.sendSMS(phoneNumber);
    }
}

// Global SMS auth service
window.smsAuthService = new SMSAuthService();

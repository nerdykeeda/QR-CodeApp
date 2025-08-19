const { getUserById, findActiveSubscriptionForUser, updateUser } = require('./database');

// Middleware to check if user has premium access
const requirePremium = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.body.userId;
        if (!userId) {
            return res.status(401).json({ 
                error: 'Authentication required',
                requiresPremium: true 
            });
        }

        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ 
                error: 'User not found',
                requiresPremium: true 
            });
        }

        // Check if user has active premium subscription
        const isPremium = await checkPremiumStatus(user);
        
        if (!isPremium) {
            return res.status(403).json({ 
                error: 'Premium plan required',
                requiresPremium: true,
                message: 'This feature requires a premium subscription. Upgrade to access logo uploads, analytics, and more.',
                plans: {
                    monthly: { price: '$2/month', features: ['Logo in QR codes', 'Advanced analytics', 'Priority support'] },
                    yearly: { price: '$9/year', features: ['Logo in QR codes', 'Advanced analytics', 'Priority support', '2 months free'] }
                }
            });
        }

        req.userPremium = true;
        next();
    } catch (error) {
        console.error('Premium check error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            requiresPremium: true 
        });
    }
};

// Check if user has active premium subscription
const checkPremiumStatus = async (user) => {
    try {
        // Check if user plan is premium and not expired
        if (user.plan === 'premium' && user.planExpiry && new Date(user.planExpiry) > new Date()) {
            return true;
        }

        // Check for active Stripe subscription
        if (user.stripeCustomerId) {
            const subscription = await findActiveSubscriptionForUser(user.id || user._id);
            if (subscription && new Date(subscription.currentPeriodEnd) > new Date()) {
                await updateUser(user.id || user._id, {
                    plan: 'premium',
                    planExpiry: subscription.currentPeriodEnd,
                });
                return true;
            }
        }

        // Downgrade to free if premium expired
        if (user.plan === 'premium') {
            await updateUser(user.id || user._id, { plan: 'free', planExpiry: null });
        }

        return false;
    } catch (error) {
        console.error('Error checking premium status:', error);
        return false;
    }
};

// Middleware to check premium features without blocking
const checkPremiumFeatures = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.body.userId;
        if (!userId) {
            req.premiumFeatures = { available: false, plan: 'free' };
            return next();
        }

        const user = await getUserById(userId);
        if (!user) {
            req.premiumFeatures = { available: false, plan: 'free' };
            return next();
        }

        const isPremium = await checkPremiumStatus(user);
        req.premiumFeatures = {
            available: isPremium,
            plan: user.plan,
            planExpiry: user.planExpiry,
            features: isPremium ? [
                'Logo in QR codes',
                'Advanced analytics',
                'Priority support',
                'Custom QR colors',
                'Bulk operations'
            ] : [
                'Basic QR generation',
                'Standard features'
            ]
        };

        next();
    } catch (error) {
        console.error('Premium features check error:', error);
        req.premiumFeatures = { available: false, plan: 'free' };
        next();
    }
};

// Helper function to get premium features for a user
const getUserPremiumFeatures = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) return { available: false, plan: 'free' };

        const isPremium = await checkPremiumStatus(user);
        return {
            available: isPremium,
            plan: user.plan,
            planExpiry: user.planExpiry,
            features: isPremium ? [
                'Logo in QR codes',
                'Advanced analytics',
                'Priority support',
                'Custom QR colors',
                'Bulk operations'
            ] : [
                'Basic QR generation',
                'Standard features'
            ]
        };
    } catch (error) {
        console.error('Error getting user premium features:', error);
        return { available: false, plan: 'free' };
    }
};

module.exports = {
    requirePremium,
    checkPremiumStatus,
    checkPremiumFeatures,
    getUserPremiumFeatures
};

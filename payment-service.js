const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
    constructor() {
        this.prices = {
            monthly: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly_placeholder',
            yearly: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly_placeholder'
        };
    }

    // Create a customer in Stripe
    async createCustomer(email, firstName, lastName) {
        try {
            const customer = await stripe.customers.create({
                email,
                name: `${firstName} ${lastName}`,
                metadata: {
                    firstName,
                    lastName
                }
            });
            return { success: true, customerId: customer.id };
        } catch (error) {
            console.error('Error creating Stripe customer:', error);
            return { success: false, error: error.message };
        }
    }

    // Create a subscription
    async createSubscription(customerId, priceId, metadata = {}) {
        try {
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                metadata,
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
            });
            return { success: true, subscription };
        } catch (error) {
            console.error('Error creating subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Cancel a subscription
    async cancelSubscription(subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });
            return { success: true, subscription };
        } catch (error) {
            console.error('Error canceling subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Get subscription details
    async getSubscription(subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            return { success: true, subscription };
        } catch (error) {
            console.error('Error retrieving subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Create checkout session
    async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, metadata = {}) {
        try {
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: priceId,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata,
                allow_promotion_codes: true,
            });
            return { success: true, sessionId: session.id, url: session.url };
        } catch (error) {
            console.error('Error creating checkout session:', error);
            return { success: false, error: error.message };
        }
    }

    // Handle webhook events
    async handleWebhook(event) {
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
            return { success: true };
        } catch (error) {
            console.error('Error handling webhook:', error);
            return { success: false, error: error.message };
        }
    }

    // Handle subscription created
    async handleSubscriptionCreated(subscription) {
        console.log('Subscription created:', subscription.id);
        // Update user plan in database
    }

    // Handle subscription updated
    async handleSubscriptionUpdated(subscription) {
        console.log('Subscription updated:', subscription.id);
        // Update user plan status in database
    }

    // Handle subscription deleted
    async handleSubscriptionDeleted(subscription) {
        console.log('Subscription deleted:', subscription.id);
        // Downgrade user to free plan
    }

    // Handle payment succeeded
    async handlePaymentSucceeded(invoice) {
        console.log('Payment succeeded for invoice:', invoice.id);
        // Update user plan expiry
    }

    // Handle payment failed
    async handlePaymentFailed(invoice) {
        console.log('Payment failed for invoice:', invoice.id);
        // Handle failed payment (send email, update status)
    }
}

module.exports = PaymentService;

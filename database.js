const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/linqrius', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`🗄️ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// User Schema
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: String,
    password: { type: String, required: true },
    twoFactorEnabled: { type: Boolean, default: false },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    planExpiry: Date,
    stripeCustomerId: String,
    createdAt: { type: Date, default: Date.now },
    lastLogin: Date
});

// Store Schema
const storeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storeName: { type: String, required: true },
    storeDescription: String,
    storeCategory: String,
    storeLogo: String,
    storeBanner: String,
    products: [{
        id: String,
        name: { type: String, required: true },
        description: String,
        price: String,
        image: String,
        url: String,
        category: String
    }],
    storeUrl: { type: String, unique: true },
    qrCode: String,
    published: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Link Schema
const linkSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalUrl: { type: String, required: true },
    shortUrl: { type: String, required: true, unique: true },
    customAlias: String,
    title: String,
    clicks: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    lastClicked: Date
});

// Premium Subscription Schema
const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stripeSubscriptionId: { type: String, required: true },
    plan: { type: String, enum: ['monthly', 'yearly'], required: true },
    status: { type: String, enum: ['active', 'canceled', 'past_due'], default: 'active' },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Store = mongoose.model('Store', storeSchema);
const Link = mongoose.model('Link', linkSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = {
    connectDB,
    User,
    Store,
    Link,
    Subscription
};

require('dotenv').config();
const { db, admin } = require('./firebase');

// No-op connection to match existing call sites
async function connectDB() {
  console.log('🗄️ Firestore Connected');
  return db;
}

// Collections
const usersCol = db.collection('users');
const linksCol = db.collection('links');
const storesCol = db.collection('stores');
const subsCol = db.collection('subscriptions');

// Helper to serialize Firestore doc
function withId(snapshot) {
  if (!snapshot?.exists) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// Users API
async function getUserById(userId) {
  const snap = await usersCol.doc(String(userId)).get();
  return withId(snap);
}

async function findUserByEmail(email) {
  const q = await usersCol.where('email', '==', String(email).toLowerCase()).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
}

async function createUser(data) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: String(data.email).toLowerCase(),
    passwordHash: data.passwordHash,
    phoneNumber: data.phoneNumber || null,
    twoFactorEnabled: !!data.twoFactorEnabled,
    plan: data.plan || 'free',
    planExpiry: data.planExpiry || null,
    stripeCustomerId: data.stripeCustomerId || null,
    createdAt: now,
    updatedAt: now,
    lastLogin: null,
  };
  const ref = await usersCol.add(payload);
  const snap = await ref.get();
  return withId(snap);
}

async function updateUser(userId, data) {
  await usersCol.doc(String(userId)).set(
    { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  return getUserById(userId);
}

// Links API
async function findLinkByShort(shortUrl) {
  const q = await linksCol.where('shortUrl', '==', shortUrl).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
}

async function findLinkByIdForUser(id, userId) {
  const doc = await linksCol.doc(String(id)).get();
  const item = withId(doc);
  if (!item || String(item.userId) !== String(userId)) return null;
  return item;
}

async function createLink({ userId, originalUrl, shortUrl, customAlias }) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  // Ensure unique shortUrl
  const existing = await findLinkByShort(shortUrl);
  if (existing) {
    throw new Error('Custom alias already taken');
  }
  const docRef = await linksCol.add({
    userId: String(userId),
    originalUrl,
    shortUrl,
    customAlias: customAlias || null,
    clicks: 0,
    createdAt: now,
    lastClicked: null,
  });
  const created = await docRef.get();
  return withId(created);
}

async function getUserLinks(userId) {
  const q = await linksCol
    .where('userId', '==', String(userId))
    .orderBy('createdAt', 'desc')
    .get();
  return q.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function deleteLinkByIdForUser(id, userId) {
  const link = await findLinkByIdForUser(id, userId);
  if (!link) return false;
  await linksCol.doc(String(id)).delete();
  return true;
}

async function incrementLinkClick(linkId) {
  await linksCol.doc(String(linkId)).update({
    clicks: admin.firestore.FieldValue.increment(1),
    lastClicked: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Stores API
async function upsertStore(id, data) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    userId: data.userId ? String(data.userId) : null,
    storeName: data.storeName,
    storeDescription: data.storeDescription || '',
    storeCategory: data.storeCategory || '',
    storeLogo: data.storeLogo || '',
    storeBanner: data.storeBanner || '',
    products: Array.isArray(data.products) ? data.products : [],
    storeUrl: data.storeUrl,
    storeUrlSlug: (data.storeUrl || data.storeName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    published: data.published ?? true,
    views: data.views ?? 0,
    updatedAt: now,
  };

  if (id) {
    await storesCol.doc(String(id)).set(payload, { merge: true });
    const snap = await storesCol.doc(String(id)).get();
    return withId(snap);
  }

  const docRef = await storesCol.add({ ...payload, createdAt: now });
  const created = await docRef.get();
  return withId(created);
}

async function findStoreByIdOrUrl(idOrSlug) {
  // Try by doc ID first
  const byId = await storesCol.doc(String(idOrSlug)).get();
  if (byId.exists) return withId(byId);

  // Then by slug (case-insensitive via normalized slug field)
  const slug = String(idOrSlug).toLowerCase();
  const q = await storesCol.where('storeUrlSlug', '==', slug).limit(1).get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
}

async function incrementStoreViews(storeId) {
  await storesCol.doc(String(storeId)).update({
    views: admin.firestore.FieldValue.increment(1),
  });
}

// Subscriptions
async function findActiveSubscriptionForUser(userId) {
  const q = await subsCol
    .where('userId', '==', String(userId))
    .where('status', '==', 'active')
    .orderBy('currentPeriodEnd', 'desc')
    .limit(1)
    .get();
  return q.empty ? null : { id: q.docs[0].id, ...q.docs[0].data() };
}

module.exports = {
  connectDB,
  // Users
  getUserById,
  findUserByEmail,
  createUser,
  updateUser,
  // Links
  findLinkByShort,
  createLink,
  getUserLinks,
  deleteLinkByIdForUser,
  incrementLinkClick,
  // Stores
  upsertStore,
  findStoreByIdOrUrl,
  incrementStoreViews,
  // Subs
  findActiveSubscriptionForUser,
};

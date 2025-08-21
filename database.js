require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://kdbwxqstkzjzwjtsjidl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYnd4cXN0a3pqendqdHNqaWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTc1MzEsImV4cCI6MjA3MDY3MzUzMX0.QvJXN03__Wzi4jptgKVapP5QvmtddSHB38y6VY2xteQ';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// No-op connection to match existing call sites
async function connectDB() {
  console.log('🗄️ Supabase Connected');
  return supabase;
}

// Helper to serialize Supabase data
function withId(data) {
  if (!data) return null;
  return { id: data.id, ...data };
}

// Users API
async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', String(userId))
    .single();
  
  if (error) return null;
  return withId(data);
}

async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', String(email).toLowerCase())
    .single();
  
  if (error) return null;
  return withId(data);
}

async function createUser(data) {
  const now = new Date().toISOString();
  const payload = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: String(data.email).toLowerCase(),
    password_hash: data.passwordHash,
    phone_number: data.phoneNumber || null,
    two_factor_enabled: !!data.twoFactorEnabled,
    plan: data.plan || 'free',
    plan_expiry: data.planExpiry || null,
            razorpay_customer_id: data.razorpayCustomerId || null,
    created_at: now,
    updated_at: now,
    last_login: null,
  };
  
  const { data: user, error } = await supabase
    .from('users')
    .insert(payload)
    .select()
    .single();
  
  if (error) throw error;
  return withId(user);
}

async function updateUser(userId, data) {
  const { data: user, error } = await supabase
    .from('users')
    .update({ 
      ...data, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', String(userId))
    .select()
    .single();
  
  if (error) throw error;
  return withId(user);
}

// Links API
async function findLinkByShort(shortUrl) {
  const { data, error } = await supabase
    .from('user_links')
    .select('*')
    .eq('short_url', shortUrl)
    .single();
  
  if (error) return null;
  return withId(data);
}

async function findLinkByIdForUser(id, userId) {
  const { data, error } = await supabase
    .from('user_links')
    .select('*')
    .eq('id', String(id))
    .eq('user_id', String(userId))
    .single();
  
  if (error) return null;
  return withId(data);
}

async function createLink({ userId, originalUrl, shortUrl, customAlias }) {
  const now = new Date().toISOString();
  
  // Ensure unique shortUrl
  const existing = await findLinkByShort(shortUrl);
  if (existing) {
    throw new Error('Custom alias already taken');
  }
  
  const { data, error } = await supabase
    .from('user_links')
    .insert({
      user_id: String(userId),
      original_url: originalUrl,
      short_url: shortUrl,
      custom_alias: customAlias || null,
      clicks: 0,
      created_at: now,
      last_clicked: null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return withId(data);
}

async function getUserLinks(userId) {
  const { data, error } = await supabase
    .from('user_links')
    .select('*')
    .eq('user_id', String(userId))
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data.map(withId);
}

async function updateLinkClicks(linkId) {
  const { data, error } = await supabase
    .from('user_links')
    .update({ 
      clicks: supabase.sql`clicks + 1`,
      last_clicked: new Date().toISOString()
    })
    .eq('id', String(linkId))
    .select()
    .single();
  
  if (error) throw error;
  return withId(data);
}

async function deleteLink(linkId, userId) {
  const { error } = await supabase
    .from('user_links')
    .delete()
    .eq('id', String(linkId))
    .eq('user_id', String(userId));
  
  if (error) throw error;
  return true;
}

// Stores API
async function findStoreByIdOrUrl(idOrUrl) {
  // First try to find by ID
  let { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', idOrUrl)
    .single();
  
  // If not found by ID, try to find by store_url
  if (error || !data) {
    const { data: urlData, error: urlError } = await supabase
      .from('stores')
      .select('*')
      .eq('store_url', idOrUrl)
      .single();
    
    if (urlError || !urlData) {
      return null;
    }
    data = urlData;
  }
  
  return withId(data);
}

async function incrementStoreViews(storeId) {
  // First get the current views count
  const { data: store, error: fetchError } = await supabase
    .from('stores')
    .select('views')
    .eq('id', String(storeId))
    .single();
  
  if (fetchError) throw fetchError;
  
  // Increment the views count
  const currentViews = store?.views || 0;
  const { error } = await supabase
    .from('stores')
    .update({ 
      views: currentViews + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', String(storeId));
  
  if (error) throw error;
  return true;
}

async function upsertStore(id, data) {
  const now = new Date().toISOString();
  const payload = {
    id: id,
    user_id: data.userId,
    store_name: data.storeName,
    store_description: data.storeDescription,
    store_category: data.storeCategory,
    store_logo: data.storeLogo,
    store_banner: data.storeBanner,
    products: data.products,
    store_url: data.storeUrl,
    published: data.published,
    created_at: now,
    updated_at: now,
  };
  
  const { data: store, error } = await supabase
    .from('stores')
    .upsert(payload)
    .select()
    .single();
  
  if (error) throw error;
  return withId(store);
}

// Subscriptions API
async function findActiveSubscriptionForUser(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', String(userId))
    .eq('status', 'active')
    .gte('current_period_end', new Date().toISOString())
    .single();
  
  if (error) return null;
  return withId(data);
}

async function createSubscription(data) {
  const now = new Date().toISOString();
  const payload = {
    user_id: data.userId,
            razorpay_subscription_id: data.razorpaySubscriptionId,
        razorpay_customer_id: data.razorpayCustomerId,
    status: data.status,
    current_period_start: data.currentPeriodStart,
    current_period_end: data.currentPeriodEnd,
    created_at: now,
    updated_at: now,
  };
  
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select()
    .single();
  
  if (error) throw error;
  return withId(subscription);
}

async function updateSubscription(id, data) {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .update({ 
      ...data, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', String(id))
    .select()
    .single();
  
  if (error) throw error;
  return withId(subscription);
}

// Export all functions
module.exports = {
  connectDB,
  getUserById,
  findUserByEmail,
  createUser,
  updateUser,
  findLinkByShort,
  findLinkByIdForUser,
  createLink,
  getUserLinks,
  updateLinkClicks,
  deleteLink,
  findStoreByIdOrUrl,
  incrementStoreViews,
  upsertStore,
  findActiveSubscriptionForUser,
  createSubscription,
  updateSubscription,
};

-- =====================================================
-- CLEAN SUPABASE SETUP FOR LINQRIUS (STEP BY STEP)
-- =====================================================
-- Run this in your Supabase SQL Editor
-- Project: kdbwxqstkzjzwjtsjidl
-- =====================================================

-- STEP 1: Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS public.app_analytics CASCADE;
DROP TABLE IF EXISTS public.user_currency_prefs CASCADE;
DROP TABLE IF EXISTS public.page_views CASCADE;
DROP TABLE IF EXISTS public.visitor_sessions CASCADE;
DROP TABLE IF EXISTS public.link_analytics CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.user_links CASCADE;
DROP TABLE IF EXISTS public.links CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- STEP 2: Create users table with Razorpay fields
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    phone_number TEXT,
    two_factor_enabled BOOLEAN DEFAULT false,
    plan TEXT DEFAULT 'free',
    plan_expiry TIMESTAMP WITH TIME ZONE,
    razorpay_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- STEP 3: Create stores table
CREATE TABLE public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    store_description TEXT,
    store_category TEXT,
    store_logo TEXT,
    store_banner TEXT,
    products JSONB DEFAULT '[]',
    store_url TEXT UNIQUE,
    published BOOLEAN DEFAULT true,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: Create subscriptions table with Razorpay fields
CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    razorpay_subscription_id TEXT,
    razorpay_customer_id TEXT,
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: Create links table (for server.js compatibility)
CREATE TABLE public.links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    short_code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    display_url TEXT NOT NULL,
    short_url TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT DEFAULT 'anonymous',
    is_active BOOLEAN DEFAULT true
);

-- STEP 6: Create user_links table
CREATE TABLE public.user_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    short_url TEXT NOT NULL UNIQUE,
    custom_alias TEXT,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_clicked TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    title TEXT,
    description TEXT
);

-- STEP 7: Create user_profiles table
CREATE TABLE public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 8: Create link_analytics table
CREATE TABLE public.link_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID REFERENCES public.user_links(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    country TEXT,
    city TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 9: Create visitor_sessions table
CREATE TABLE public.visitor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    country TEXT,
    city TEXT,
    timezone TEXT,
    currency TEXT DEFAULT 'USD',
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 10: Create page_views table
CREATE TABLE public.page_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT REFERENCES public.visitor_sessions(session_id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    page_type TEXT DEFAULT 'page_view',
    view_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 11: Create user_currency_prefs table
CREATE TABLE public.user_currency_prefs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    preferred_currency TEXT DEFAULT 'USD',
    auto_detect BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 12: Create app_analytics table
CREATE TABLE public.app_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT UNIQUE NOT NULL,
    metric_value JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 13: Create premium_subscriptions table (existing, enhanced)
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 14: Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_razorpay_customer_id ON public.users(razorpay_customer_id);
CREATE INDEX idx_stores_user_id ON public.stores(user_id);
CREATE INDEX idx_stores_url ON public.stores(store_url);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_razorpay_customer_id ON public.subscriptions(razorpay_customer_id);
CREATE INDEX idx_links_short_code ON public.links(short_code);
CREATE INDEX idx_user_links_user_id ON public.user_links(user_id);
CREATE INDEX idx_user_links_short_url ON public.user_links(short_url);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_link_analytics_link_id ON public.link_analytics(link_id);
CREATE INDEX idx_visitor_sessions_session_id ON public.visitor_sessions(session_id);
CREATE INDEX idx_page_views_session_id ON public.page_views(session_id);
CREATE INDEX idx_user_currency_prefs_user_id ON public.user_currency_prefs(user_id);

-- STEP 15: Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_currency_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- STEP 16: Create RLS policies for service role (needed for server operations)
-- Allow service role full access to all tables
CREATE POLICY "Service role full access" ON public.users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.stores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.user_links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.user_profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.link_analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.visitor_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.page_views FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.user_currency_prefs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.app_analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.premium_subscriptions FOR ALL USING (auth.role() = 'service_role');

-- STEP 17: Create RLS policies for authenticated users
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can manage own stores" ON public.stores FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own links" ON public.user_links FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own profiles" ON public.user_profiles FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own currency prefs" ON public.user_currency_prefs FOR ALL USING (auth.uid()::text = user_id::text);

-- STEP 18: Create RLS policies for public access (where needed)
-- Anyone can view published stores
CREATE POLICY "Anyone can view published stores" ON public.stores FOR SELECT USING (published = true);

-- Anyone can access links (for redirects)
CREATE POLICY "Anyone can access links" ON public.links FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can access user links" ON public.user_links FOR SELECT USING (is_active = true);

-- STEP 19: Insert initial app analytics data
INSERT INTO public.app_analytics (metric_name, metric_value) VALUES
('total_visitors', '0'),
('total_page_views', '0'),
('total_links_created', '0'),
('total_stores_created', '0'),
('currency_distribution', '{"USD": 0, "INR": 0, "EUR": 0, "GBP": 0}'),
('top_countries', '[]'),
('feature_usage', '{"qr_generation": 0, "link_shortening": 0, "store_creation": 0, "premium_upgrades": 0}')
ON CONFLICT (metric_name) DO NOTHING;

-- STEP 20: Grant necessary permissions
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.stores TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.links TO service_role;
GRANT ALL ON public.user_links TO service_role;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.link_analytics TO service_role;
GRANT ALL ON public.visitor_sessions TO service_role;
GRANT ALL ON public.page_views TO service_role;
GRANT ALL ON public.user_currency_prefs TO service_role;
GRANT ALL ON public.app_analytics TO service_role;
GRANT ALL ON public.premium_subscriptions TO service_role;

-- STEP 21: Verify all tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- STEP 22: Show table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'stores'
ORDER BY ordinal_position;

-- =====================================================
-- SETUP COMPLETE! 
-- =====================================================
-- Your LinQrius app should now work with:
-- ✅ Razorpay payments
-- ✅ Currency localization (USD/INR/EUR/GBP)
-- ✅ Analytics & visitor tracking
-- ✅ Store & link management
-- ✅ Premium subscriptions
-- =====================================================

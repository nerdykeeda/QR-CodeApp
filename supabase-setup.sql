-- =====================================================
-- COMPREHENSIVE SUPABASE SETUP FOR LINQRIUS
-- =====================================================
-- Run this in your Supabase SQL Editor
-- Project: kdbwxqstkzjzwjtsjidl
-- =====================================================

-- Step 1: Create users table (was missing)
CREATE TABLE IF NOT EXISTS public.users (
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

-- Step 2: Create stores table (was missing)
CREATE TABLE IF NOT EXISTS public.stores (
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

-- Step 3: Create subscriptions table (was missing)
CREATE TABLE IF NOT EXISTS public.subscriptions (
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

-- Step 4: Create links table (for server.js compatibility)
CREATE TABLE IF NOT EXISTS public.links (
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

-- Step 5: Create user_links table (existing, enhanced)
CREATE TABLE IF NOT EXISTS public.user_links (
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

-- Step 6: Create user_profiles table (existing)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create link_analytics table (existing)
CREATE TABLE IF NOT EXISTS public.link_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link_id UUID REFERENCES public.user_links(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    country TEXT,
    city TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 8: Create premium_subscriptions table (existing)
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NEW ANALYTICS & CURRENCY TABLES
-- =====================================================

-- Step 9: Create visitor_sessions table for analytics
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    ip_address INET,
    country TEXT,
    city TEXT,
    timezone TEXT,
    currency TEXT DEFAULT 'USD',
    user_agent TEXT,
    referrer TEXT,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    visit_count INTEGER DEFAULT 1
);

-- Step 10: Create page_views table for feature tracking
CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT REFERENCES public.visitor_sessions(session_id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    feature_used TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 11: Create user_currency_prefs table
CREATE TABLE IF NOT EXISTS public.user_currency_prefs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    preferred_currency TEXT DEFAULT 'USD',
    detected_country TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 12: Create app_analytics table for overall stats
CREATE TABLE IF NOT EXISTS public.app_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT UNIQUE NOT NULL,
    metric_value JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer_id ON public.users(razorpay_customer_id);

-- Stores indexes
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_store_url ON public.stores(store_url);
CREATE INDEX IF NOT EXISTS idx_stores_published ON public.stores(published);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Links indexes
CREATE INDEX IF NOT EXISTS idx_links_short_code ON public.links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_is_active ON public.links(is_active);

-- User links indexes
CREATE INDEX IF NOT EXISTS idx_user_links_user_id ON public.user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_short_url ON public.user_links(short_url);
CREATE INDEX IF NOT EXISTS idx_user_links_created_at ON public.user_links(created_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session_id ON public.visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country ON public.visitor_sessions(country);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_currency ON public.visitor_sessions(currency);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON public.page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_feature ON public.page_views(feature_used);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_currency_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Allow service role full access (needed for server operations)
CREATE POLICY "Service role full access" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

-- Stores table policies
CREATE POLICY "Anyone can view published stores" ON public.stores
    FOR SELECT USING (published = true);

CREATE POLICY "Users can manage own stores" ON public.stores
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role full access" ON public.stores
    FOR ALL USING (auth.role() = 'service_role');

-- Links table policies (public access for redirects)
CREATE POLICY "Anyone can view active links" ON public.links
    FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access" ON public.links
    FOR ALL USING (auth.role() = 'service_role');

-- User links policies
CREATE POLICY "Users can view own links" ON public.user_links
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own links" ON public.user_links
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role full access" ON public.user_links
    FOR ALL USING (auth.role() = 'service_role');

-- Analytics policies (public read, authenticated write)
CREATE POLICY "Anyone can read analytics" ON public.visitor_sessions
    FOR SELECT USING (true);

CREATE POLICY "Service role can write analytics" ON public.visitor_sessions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update analytics" ON public.visitor_sessions
    FOR UPDATE USING (auth.role() = 'service_role');

-- Similar policies for other analytics tables
CREATE POLICY "Service role analytics access" ON public.page_views
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role analytics access" ON public.app_analytics
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated and anonymous users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant permissions to service role (needed for server operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update last_visit timestamp
CREATE OR REPLACE FUNCTION public.update_last_visit()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_visit = NOW();
    NEW.visit_count = OLD.visit_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for visitor sessions
CREATE TRIGGER update_visitor_last_visit
    BEFORE UPDATE ON public.visitor_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_last_visit();

-- Function to auto-create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.first_name || ' ' || NEW.last_name, 'User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new users
DROP TRIGGER IF EXISTS on_users_created ON public.users;
CREATE TRIGGER on_users_created
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default app analytics
INSERT INTO public.app_analytics (metric_name, metric_value) VALUES
('total_users', '0'),
('total_links', '0'),
('total_stores', '0'),
('total_visitors', '0'),
('popular_countries', '[]'),
('currency_distribution', '{"USD": 0, "INR": 0}')
ON CONFLICT (metric_name) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'users', 'stores', 'subscriptions', 'links', 'user_links', 
    'user_profiles', 'link_analytics', 'premium_subscriptions',
    'visitor_sessions', 'page_views', 'user_currency_prefs', 'app_analytics'
)
ORDER BY table_name;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'stores', 'subscriptions', 'links', 'user_links', 
    'user_profiles', 'link_analytics', 'premium_subscriptions',
    'visitor_sessions', 'page_views', 'user_currency_prefs', 'app_analytics'
)
ORDER BY tablename;

-- =====================================================
-- SETUP COMPLETE! 🎉
-- =====================================================
-- Your Supabase database is now ready for LinQrius with:
-- ✅ All missing tables created
-- ✅ Analytics and currency support
-- ✅ Proper permissions and RLS
-- ✅ Performance indexes
-- ✅ Service role access for server operations
-- 
-- Next steps:
-- 1. Run this SQL in your Supabase dashboard
-- 2. Restart your server
-- 3. Test all functionality
-- =====================================================

-- =====================================================
-- SUPABASE SETUP FOR LINQRIUS LINK SHORTENER
-- =====================================================
-- Run this in your Supabase SQL Editor
-- Project: kdbwxqstkzjzwjtsjidl
-- =====================================================

-- Step 1: Create user_links table for storing shortened links
CREATE TABLE IF NOT EXISTS public.user_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Step 2: Create user_profiles table for additional user information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create link_analytics table for detailed tracking
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

-- Step 4: Create premium_subscriptions table (for future use)
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Enable Row Level Security (RLS) on all tables
ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for user_links table
-- Users can view only their own links
CREATE POLICY "Users can view own links" ON public.user_links
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own links
CREATE POLICY "Users can insert own links" ON public.user_links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own links
CREATE POLICY "Users can update own links" ON public.user_links
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own links
CREATE POLICY "Users can delete own links" ON public.user_links
    FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Create RLS policies for user_profiles table
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Create RLS policies for link_analytics table
-- Users can view analytics for their own links
CREATE POLICY "Users can view own link analytics" ON public.link_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_links 
            WHERE user_links.id = link_analytics.link_id 
            AND user_links.user_id = auth.uid()
        )
    );

-- Analytics can be inserted for any link (for tracking purposes)
CREATE POLICY "Analytics can be inserted for any link" ON public.link_analytics
    FOR INSERT WITH CHECK (true);

-- Step 9: Create RLS policies for premium_subscriptions table
-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON public.premium_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscription
CREATE POLICY "Users can insert own subscription" ON public.premium_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription" ON public.premium_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Step 10: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_links_user_id ON public.user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_short_url ON public.user_links(short_url);
CREATE INDEX IF NOT EXISTS idx_user_links_created_at ON public.user_links(created_at);
CREATE INDEX IF NOT EXISTS idx_link_analytics_link_id ON public.link_analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_link_analytics_clicked_at ON public.link_analytics(clicked_at);

-- Step 11: Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 13: Create function to get user's total link count
CREATE OR REPLACE FUNCTION public.get_user_link_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM public.user_links 
        WHERE user_id = user_uuid AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create function to get user's total clicks
CREATE OR REPLACE FUNCTION public.get_user_total_clicks(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(clicks), 0)
        FROM public.user_links 
        WHERE user_id = user_uuid AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Insert default premium subscription for new users
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.premium_subscriptions (user_id, plan_type, status, features)
    VALUES (
        NEW.user_id,
        'free',
        'active',
        '{"max_links": 10, "custom_aliases": false, "analytics": false, "qr_codes": true}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 16: Create trigger for default subscription
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;
CREATE TRIGGER on_user_profile_created
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Step 17: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_links TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.link_analytics TO anon, authenticated;
GRANT ALL ON public.premium_subscriptions TO anon, authenticated;

-- Step 18: Create view for user dashboard data
CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT 
    u.id as user_id,
    u.email,
    up.full_name,
    up.avatar_url,
    COUNT(ul.id) as total_links,
    COALESCE(SUM(ul.clicks), 0) as total_clicks,
    ps.plan_type,
    ps.status as subscription_status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.user_links ul ON u.id = ul.user_id AND ul.is_active = true
LEFT JOIN public.premium_subscriptions ps ON u.id = ps.user_id AND ps.status = 'active'
GROUP BY u.id, u.email, up.full_name, up.avatar_url, ps.plan_type, ps.status;

-- Step 19: Grant access to the view
GRANT SELECT ON public.user_dashboard TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES (Run these to check setup)
-- =====================================================

-- Check if tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_links', 'user_profiles', 'link_analytics', 'premium_subscriptions')
ORDER BY table_name;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_links', 'user_profiles', 'link_analytics', 'premium_subscriptions');

-- Check if policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- SAMPLE DATA INSERTION (Optional - for testing)
-- =====================================================

-- Note: These will only work after you create a user account
-- Uncomment and run after testing the signup flow

/*
-- Insert sample link (replace 'your-user-id' with actual user ID)
INSERT INTO public.user_links (user_id, original_url, short_url, title, description)
VALUES (
    'your-user-id-here',
    'https://example.com/very-long-url-that-needs-shortening',
    'linqrius.com/abc123',
    'Example Link',
    'This is a sample link for testing'
);

-- Insert sample profile data
INSERT INTO public.user_profiles (user_id, full_name, bio)
VALUES (
    'your-user-id-here',
    'John Doe',
    'Link shortening enthusiast'
);
*/

-- =====================================================
-- SETUP COMPLETE! 🎉
-- =====================================================
-- Your Supabase database is now ready for LinQrius!
-- 
-- Next steps:
-- 1. Test the signup flow in your app
-- 2. Check the Authentication section in Supabase dashboard
-- 3. Verify email confirmations are enabled
-- 4. Test creating and viewing links
-- =====================================================

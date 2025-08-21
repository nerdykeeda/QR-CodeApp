-- =====================================================
-- FIX RLS POLICIES FOR SERVICE ROLE ACCESS
-- =====================================================
-- Run this AFTER the main setup to fix RLS issues

-- First, disable RLS temporarily to ensure clean setup
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_currency_prefs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions DISABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.stores;
DROP POLICY IF EXISTS "Service role full access" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access" ON public.links;
DROP POLICY IF EXISTS "Service role full access" ON public.user_links;
DROP POLICY IF EXISTS "Service role full access" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.link_analytics;
DROP POLICY IF EXISTS "Service role full access" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Service role full access" ON public.page_views;
DROP POLICY IF EXISTS "Service role full access" ON public.user_currency_prefs;
DROP POLICY IF EXISTS "Service role full access" ON public.app_analytics;
DROP POLICY IF EXISTS "Service role full access" ON public.premium_subscriptions;

-- Drop any other existing policies
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
DROP POLICY IF EXISTS "Service role full access stores" ON public.stores;
DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access links" ON public.links;
DROP POLICY IF EXISTS "Service role full access user_links" ON public.user_links;
DROP POLICY IF EXISTS "Service role full access user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role full access link_analytics" ON public.link_analytics;
DROP POLICY IF EXISTS "Service role full access visitor_sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Service role full access page_views" ON public.page_views;
DROP POLICY IF EXISTS "Service role full access user_currency_prefs" ON public.user_currency_prefs;
DROP POLICY IF EXISTS "Service role full access app_analytics" ON public.app_analytics;
DROP POLICY IF EXISTS "Service role full access premium_subscriptions" ON public.premium_subscriptions;

-- Grant all permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO service_role;

-- Now re-enable RLS with proper policies
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

-- Create comprehensive policies for service role
CREATE POLICY "service_role_all_access_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_links" ON public.links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_user_links" ON public.user_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_link_analytics" ON public.link_analytics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_visitor_sessions" ON public.visitor_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_page_views" ON public.page_views FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_user_currency_prefs" ON public.user_currency_prefs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_app_analytics" ON public.app_analytics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_access_premium_subscriptions" ON public.premium_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- Also create policies for authenticated users (if needed)
CREATE POLICY "authenticated_users_access" ON public.users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_users_access" ON public.links FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_users_access" ON public.user_links FOR ALL USING (auth.role() = 'authenticated');

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND policyname LIKE '%service_role%';

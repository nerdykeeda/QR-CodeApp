// Supabase Configuration for LinQrius
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kdbwxqstkzjzwjtsjidl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYnd4cXN0a3pqendqdHNqaWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTc1MzEsImV4cCI6MjA3MDY3MzUzMX0.QvJXN03__Wzi4jptgKVapP5QvmtddSHB38y6VY2xteQ';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export class SupabaseAuth {
    // Sign up with email
    static async signUp(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: `${window.location.origin}/link-shorten.html`
                }
            });

            if (error) throw error;

            return {
                success: true,
                data: data,
                message: 'Verification email sent successfully!'
            };
        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Sign in with email and password
    static async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            return {
                success: true,
                data: data,
                message: 'Signed in successfully!'
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Sign out
    static async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            return {
                success: true,
                message: 'Signed out successfully!'
            };
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Reset password
    static async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/link-shorten.html?reset=true`
            });

            if (error) throw error;

            return {
                success: true,
                message: 'Password reset email sent!'
            };
        } catch (error) {
            console.error('Reset password error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get current user
    static async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) throw error;

            return {
                success: true,
                user: user
            };
        } catch (error) {
            console.error('Get user error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get session
    static async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;

            return {
                success: true,
                session: session
            };
        } catch (error) {
            console.error('Get session error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Listen to auth changes
    static onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
}

// Database functions for user links
export class SupabaseDatabase {
    // Create a new link for user
    static async createLink(userId, originalUrl, shortUrl) {
        try {
            const { data, error } = await supabase
                .from('user_links')
                .insert([
                    {
                        user_id: userId,
                        original_url: originalUrl,
                        short_url: shortUrl,
                        clicks: 0,
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) throw error;

            return {
                success: true,
                data: data[0]
            };
        } catch (error) {
            console.error('Create link error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get user's links
    static async getUserLinks(userId) {
        try {
            const { data, error } = await supabase
                .from('user_links')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Get user links error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update link clicks
    static async updateLinkClicks(linkId) {
        try {
            const { data, error } = await supabase
                .from('user_links')
                .update({ 
                    clicks: supabase.sql`clicks + 1`,
                    last_clicked: new Date().toISOString()
                })
                .eq('id', linkId)
                .select();

            if (error) throw error;

            return {
                success: true,
                data: data[0]
            };
        } catch (error) {
            console.error('Update link clicks error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for use in other files
export default { supabase, SupabaseAuth, SupabaseDatabase };

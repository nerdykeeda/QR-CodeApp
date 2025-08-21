# 🚀 Quick Supabase Setup Guide

## **Step 1: Access Supabase Dashboard**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your account
3. Click on your project: **`kdbwxqstkzjzwjtsjidl`**

## **Step 2: Open SQL Editor**
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New Query"** button
3. Give it a name like: `LinQrius Database Setup`

## **Step 3: Run the SQL File**
1. Copy the entire contents of `supabase-setup.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** button (or press Ctrl+Enter)

## **Step 4: Verify Setup**
After running the SQL, you should see:
- ✅ **Tables created**: `user_links`, `user_profiles`, `link_analytics`, `premium_subscriptions`
- ✅ **RLS enabled**: Row Level Security is active
- ✅ **Policies created**: Security policies are in place
- ✅ **Functions created**: Helper functions for user management

## **Step 5: Enable Email Authentication**
1. Go to **"Authentication"** → **"Settings"**
2. Enable **"Email confirmations"**
3. Set **"Site URL"** to your domain (or `http://localhost:3000` for testing)
4. Add **"Redirect URLs"**: `http://localhost:3000/link-shorten.html`

## **Step 6: Test the System**
1. **Refresh your app page**
2. **Click "Sign Up"**
3. **Enter your email**
4. **Check your inbox** for verification email
5. **Click the verification link**
6. **Create your password**

## **🔍 If Something Goes Wrong:**

### **Error: "relation already exists"**
- This means tables were already created
- Just continue to the next step

### **Error: "permission denied"**
- Make sure you're in the right project
- Check that you have admin access

### **No verification email received:**
- Check spam folder
- Verify email address is correct
- Check Supabase dashboard → Authentication → Users

## **📊 What Gets Created:**

| Table | Purpose | Features |
|-------|---------|----------|
| `user_links` | Store shortened URLs | Clicks, analytics, custom aliases |
| `user_profiles` | User information | Names, avatars, bios |
| `link_analytics` | Click tracking | IP, location, referrer data |
| `premium_subscriptions` | Future premium plans | Feature limits, plan types |

## **🛡️ Security Features:**
- ✅ **Row Level Security**: Users only see their own data
- ✅ **Automatic user profiles**: Created when users sign up
- ✅ **Secure policies**: No unauthorized access possible
- ✅ **Audit trails**: Track all link clicks and analytics

## **🎯 Next Steps After Setup:**
1. **Test signup/login** in your app
2. **Create some test links** to verify database works
3. **Check analytics** in Supabase dashboard
4. **Customize email templates** (optional)

---

## **🚨 IMPORTANT:**
- **Never share your Supabase keys** publicly
- **Keep your project URL private** during development
- **Test thoroughly** before going live
- **Monitor usage** in Supabase dashboard

---

**Your database is now ready! 🎉**

Run the SQL file and you'll have a production-ready authentication and link management system!

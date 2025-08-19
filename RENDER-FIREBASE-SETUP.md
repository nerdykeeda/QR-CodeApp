# 🚀 Render + Firebase Setup Guide

## Setting Firebase Credentials in Render Dashboard

Since you're deploying on Render, you need to set Firebase credentials as **Environment Variables** in your Render dashboard.

## 📍 **Step-by-Step Instructions:**

### 1. Go to Render Dashboard
- Visit [dashboard.render.com](https://dashboard.render.com)
- Sign in to your account
- Select your **QR Code App service**

### 2. Navigate to Environment Variables
- Click **"Environment"** in the left sidebar
- Click **"Add Environment Variable"**

### 3. Add These Three Variables:

#### Variable 1: `FIREBASE_PROJECT_ID`
- **Name:** `FIREBASE_PROJECT_ID`
- **Value:** Your Firebase project ID (e.g., `my-awesome-project-123`)

#### Variable 2: `FIREBASE_CLIENT_EMAIL`
- **Name:** `FIREBASE_CLIENT_EMAIL`
- **Value:** Your Firebase service account email (e.g., `firebase-adminsdk-abc123@my-awesome-project-123.iam.gserviceaccount.com`)

#### Variable 3: `FIREBASE_PRIVATE_KEY`
- **Name:** `FIREBASE_PRIVATE_KEY`
- **Value:** Your Firebase private key (copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

## 🔑 **Getting Firebase Credentials:**

### From Firebase Console:
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select your project
3. Click **⚙️ Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Download the JSON file

### From the JSON file:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abc123@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

**Copy these values:**
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

## ⚠️ **Important Notes:**

- **Keep the quotes** around the private key value in Render
- **Copy the entire private key** including the BEGIN/END markers
- **Don't add extra spaces** before or after the values
- **Redeploy your service** after adding environment variables

## 🔄 **After Adding Variables:**

1. **Save all environment variables**
2. **Click "Manual Deploy"** or wait for auto-deploy
3. **Check the logs** to ensure Firebase connects successfully

## 🧪 **Test Your Setup:**

Once deployed, your app should work without the Firebase credentials error. You can check the logs in Render to see if Firebase is connecting properly.

## 🆘 **Need Help?**

- Check Render logs for specific error messages
- Verify all three environment variables are set correctly
- Make sure your Firebase project is active and accessible
- Ensure your service account has the right permissions

Your app should now work perfectly on Render with Firebase! 🎉

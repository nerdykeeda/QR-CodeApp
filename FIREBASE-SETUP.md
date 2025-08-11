# 🔥 Firebase Setup Guide

## Quick Fix for "Missing Firebase Admin credentials" Error

Your app is now configured to use a `firebase-config.js` file instead of environment variables. Follow these steps:

## Step 1: Get Firebase Service Account Key

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Select your project** (or create one if you don't have it)
3. **Go to Project Settings** (gear icon) → **Service Accounts**
4. **Click "Generate New Private Key"**
5. **Download the JSON file**

## Step 2: Update firebase-config.js

Open `firebase-config.js` and replace the placeholder values:

```javascript
module.exports = {
  // Replace with your actual Firebase project ID
  projectId: 'my-awesome-project-123',
  
  // Replace with your actual service account email
  clientEmail: 'firebase-adminsdk-abc123@my-awesome-project-123.iam.gserviceaccount.com',
  
  // Replace with your actual private key from the JSON file
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
... (your actual private key here) ...
-----END PRIVATE KEY-----`
};
```

## Step 3: Important Notes

- **Keep the backticks** (`) around the private key
- **Use actual newlines** in the private key, not `\n` characters
- **Don't share** your private key or commit it to version control
- **Restart your server** after making changes

## Step 4: Test Your Setup

1. **Save the firebase-config.js file**
2. **Restart your Node.js server**
3. **Check if the error is gone**

## Alternative: Use Environment Variables

If you prefer environment variables, you can:

1. **Create a `.env` file** in your project root
2. **Add your Firebase credentials**:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="your-private-key"
   ```
3. **Install dotenv**: `npm install dotenv`
4. **Update firebase.js** to use `process.env` again

## Need Help?

- Check the [Firebase Console](https://console.firebase.google.com/)
- Verify your service account has the right permissions
- Make sure your project ID matches exactly
- Ensure the private key is copied correctly with newlines

Your app should work once you've filled in the correct Firebase credentials!

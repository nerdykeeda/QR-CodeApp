# 📱 LinQrius Android APK - Step by Step Guide

## 🎯 **Method 1: Using Android Studio (Recommended)**

### **Step 1: Download Android Studio**
1. Go to: https://developer.android.com/studio
2. Download and install Android Studio
3. Open Android Studio and complete setup

### **Step 2: Create New Project**
1. **Open Android Studio**
2. **Choose**: "Empty Activity"
3. **Name**: LinQrius
4. **Package**: com.linq.vcardqr  
5. **Language**: Java
6. **API Level**: 21 (Android 5.0)

### **Step 3: Add WebView**
1. **Copy all your web files** (HTML, CSS, JS) to `app/src/main/assets/`
2. **Edit MainActivity.java** to load WebView:

```java
package com.linq.vcardqr;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webview);
        webView.setWebViewClient(new WebViewClient());
        
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        
        webView.loadUrl("file:///android_asset/index.html");
    }
}
```

3. **Edit activity_main.xml**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<WebView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/webview"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

### **Step 4: Add Permissions**
Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### **Step 5: Build APK**
1. **Click**: Build → Build Bundle(s) / APK(s) → Build APK(s)
2. **Wait** for build to complete
3. **Click**: "locate" to find your APK file

---

## 🎯 **Method 2: Online APK Builder (If you have web hosting)**

### **Step 1: Upload to Web**
1. **Get free hosting**: Netlify, Vercel, GitHub Pages
2. **Upload your files**
3. **Get your live URL** (e.g., https://yourapp.netlify.app)

### **Step 2: Use Online Builder**
1. **Go to**: https://www.websitetoapk.com/
2. **Enter your live URL**
3. **Customize app details**
4. **Download APK**

---

## 🎯 **Method 3: Cordova CLI (Advanced)**

### **Prerequisites:**
```bash
npm install -g cordova
```

### **Steps:**
```bash
# Create project
cordova create LinQrius com.linq.vcardqr LinQrius

# Copy your web files to www/
# Replace www/ contents with your files

# Add Android platform
cd LinQrius
cordova platform add android

# Build APK
cordova build android
```

---

## 📋 **Files Ready for APK:**
✅ `index.html` - Main app  
✅ `script.js` - App logic  
✅ `styles.css` - Styling  
✅ `manifest.json` - PWA config  
✅ `config.xml` - Cordova config  
✅ All HTML pages (vcard-qr, link-shorten, clickcart)  
✅ Icons in `icons/` folder  

---

## 🎯 **Recommendation:**

**Start with Method 1 (Android Studio)** - it's the most reliable and gives you full control over the APK.

**Need help?** Let me know which method you want to try!

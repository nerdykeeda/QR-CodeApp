# 🚀 MongoDB Setup for LinQrius

## 🎯 **Option 1: MongoDB Atlas (Cloud - Recommended)**

### **Step 1: Create Free Account**
1. **Go to**: https://www.mongodb.com/atlas
2. **Sign up** for free account
3. **Create a cluster** (free tier)
4. **Set username/password**
5. **Add your IP** to whitelist (or allow all: 0.0.0.0/0)

### **Step 2: Get Connection String**
1. **Click "Connect"** on your cluster
2. **Choose "Connect your application"**
3. **Copy the connection string** (looks like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/linqrius
   ```

### **Step 3: Update Server**
1. **Create `.env` file** in your project:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/linqrius
   PORT=3000
   ```

---

## 🎯 **Option 2: Local MongoDB**

### **Step 1: Install MongoDB**
1. **Download**: https://www.mongodb.com/download-center/community
2. **Install** MongoDB Community Server
3. **Start** MongoDB service

### **Step 2: Use Local Connection**
No `.env` file needed - uses default:
```
mongodb://localhost:27017/linqrius
```

---

## 🚀 **Start Your Server**

### **Step 1: Install Dependencies**
```bash
npm install
```

### **Step 2: Run Server**
```bash
# Development (with auto-restart)
npm run dev

# OR Production
npm start
```

### **Step 3: Test**
- **Server**: http://localhost:3000
- **Link Shortener**: http://localhost:3000/link-shorten-db.html
- **Health Check**: http://localhost:3000/health

---

## 🎯 **How It Works**

### **Database Storage:**
- ✅ **Global Access**: Links work from any device/browser
- ✅ **Persistent**: Never lost (unlike localStorage)
- ✅ **Click Tracking**: Real-time statistics
- ✅ **Custom Aliases**: Reserve your preferred codes

### **API Endpoints:**
- `POST /api/links` - Create short link
- `GET /api/links` - Get all links
- `GET /r/:shortCode` - Redirect to original URL
- `DELETE /api/links/:id` - Delete link

### **URL Format:**
- **Short URLs**: `http://localhost:3000/r/ABC12`
- **Display**: `LinQ/ABC12`
- **Works everywhere** when deployed!

---

## 🌐 **Deploy to Production**

### **Vercel (Easy):**
1. **Connect** your GitHub repo to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy** - auto-deploys on git push

### **Netlify Functions:**
1. **Convert** to serverless functions
2. **Deploy** static site + functions

### **Your Own Server:**
1. **Upload** files to server
2. **Install** Node.js and MongoDB
3. **Run** `npm start`

---

## ✅ **Benefits Over localStorage**

| Feature | localStorage | MongoDB |
|---------|-------------|---------|
| **Global Access** | ❌ Device-specific | ✅ Universal |
| **Persistence** | ❌ Can be cleared | ✅ Always saved |
| **Sharing** | ❌ Can't share | ✅ Anyone can access |
| **Analytics** | ❌ Basic | ✅ Real-time clicks |
| **Backup** | ❌ No backup | ✅ Auto-backup |
| **Scale** | ❌ Limited | ✅ Unlimited |

Your links will now work globally! 🎉

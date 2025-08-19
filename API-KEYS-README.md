# 🔑 LinQrius API Key System

## Overview
LinQrius now includes a robust API key authentication system to secure your API endpoints and prevent unauthorized access. All API endpoints (except health checks) now require a valid API key.

## 🚀 Quick Start

### 1. Available API Keys
The system comes with three pre-configured API keys:

| Key Name | API Key | Permissions | Use Case |
|----------|---------|-------------|----------|
| **Main Key** | `sk-linqrius-2024-secure-key-12345` | Create, read, delete own links | Regular users |
| **Admin Key** | `sk-linqrius-admin-2024-67890` | Full access + API key management | Administrators |
| **Test Key** | `sk-linqrius-test-2024-abcde` | Create and read links | Development/testing |

### 2. Using API Keys
Include your API key in one of these ways:

**Option 1: X-API-Key Header (Recommended)**
```bash
curl -X POST http://localhost:3000/api/links \
  -H "X-API-Key: sk-linqrius-2024-secure-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com"}'
```

**Option 2: Authorization Header**
```bash
curl -X POST http://localhost:3000/api/links \
  -H "Authorization: Bearer sk-linqrius-2024-secure-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com"}'
```

## 📚 API Endpoints

### 🔗 Create Short Link
```http
POST /api/links
Headers: X-API-Key: your-api-key
Body: {"originalUrl": "https://example.com", "customAlias": "optional"}
```

### 📋 Get All Links
```http
GET /api/links
Headers: X-API-Key: your-api-key
```

### 🗑️ Delete Link
```http
DELETE /api/links/:id
Headers: X-API-Key: your-api-key
```

### 🔑 View API Keys (Admin Only)
```http
GET /api/keys
Headers: X-API-Key: admin-api-key
```

### 💚 Health Check (No Auth Required)
```http
GET /health
```

## 🧪 Testing Your API Keys

### 1. Use the API Key Management Interface
Visit `/api-keys.html` in your browser to:
- View all available API keys
- Test different endpoints
- See real-time responses

### 2. Test with curl
```bash
# Test health endpoint (no auth required)
curl http://localhost:3000/health

# Test creating a link
curl -X POST http://localhost:3000/api/links \
  -H "X-API-Key: sk-linqrius-2024-secure-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"originalUrl": "https://example.com"}'

# Test getting links
curl -H "X-API-Key: sk-linqrius-2024-secure-key-12345" \
  http://localhost:3000/api/links
```

### 3. Test with JavaScript
```javascript
// Create a short link
const response = await fetch('/api/links', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sk-linqrius-2024-secure-key-12345'
    },
    body: JSON.stringify({
        originalUrl: 'https://example.com'
    })
});

const data = await response.json();
console.log(data);
```

## 🔒 Security Features

### 1. API Key Validation
- All API keys are validated on every request
- Invalid or missing API keys return 401/403 errors
- API key usage is logged for security monitoring

### 2. Permission-Based Access
- **Main Key**: Standard user operations
- **Admin Key**: Full access including API key management
- **Test Key**: Limited access for development

### 3. Rate Limiting (Coming Soon)
- Configurable rate limits per API key
- IP-based rate limiting
- Abuse prevention

## ⚙️ Configuration

### 1. Environment Variables
```bash
# Set custom port
PORT=8080

# Set custom host
HOST=0.0.0.0
```

### 2. Custom API Keys
Edit `config.js` to add your own API keys:

```javascript
apiKeys: {
    'my-custom-key': {
        key: 'sk-my-custom-key-2024',
        permissions: ['create-links', 'read-links'],
        description: 'My custom API key'
    }
}
```

### 3. Security Settings
```javascript
security: {
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // 100 requests per window
    }
}
```

## 🚨 Error Handling

### Common Error Responses

**401 Unauthorized - Missing API Key**
```json
{
    "error": "API key required",
    "message": "Please provide an API key in the X-API-Key header or Authorization header"
}
```

**403 Forbidden - Invalid API Key**
```json
{
    "error": "Invalid API key",
    "message": "The provided API key is not valid"
}
```

**403 Forbidden - Insufficient Permissions**
```json
{
    "error": "Access denied",
    "message": "Only admin API key can access this endpoint"
}
```

## 📊 Monitoring & Logging

### 1. Server Logs
The server logs all API key usage:
```
🔑 API request authenticated with key: linqrius-main
📊 Redirecting ABC123 to https://example.com (5 clicks)
```

### 2. Health Check
Monitor API key status via health endpoint:
```json
{
    "status": "OK",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "totalLinks": 25,
    "storage": "in-memory",
    "apiKeyAuth": "enabled",
    "totalApiKeys": 3
}
```

## 🔄 Updating API Keys

### 1. Restart Required
After updating API keys in `config.js`, restart the server:
```bash
# Stop the server
Ctrl+C

# Start again
node server-simple.js
```

### 2. Rolling Updates
For production, consider implementing:
- Database-stored API keys
- Key rotation mechanisms
- Expiration dates
- Webhook notifications

## 🛡️ Best Practices

### 1. API Key Security
- Keep API keys secret and secure
- Rotate keys regularly
- Use different keys for different environments
- Never commit API keys to version control

### 2. Request Headers
- Always use HTTPS in production
- Include API key in every request
- Use `X-API-Key` header for consistency

### 3. Error Handling
- Implement proper error handling in your applications
- Log authentication failures
- Monitor for suspicious activity

## 🆘 Troubleshooting

### Common Issues

**1. "API key required" error**
- Check that you're including the API key header
- Verify the header name is correct (`X-API-Key` or `Authorization`)

**2. "Invalid API key" error**
- Verify the API key is correct
- Check for extra spaces or characters
- Ensure the server has been restarted after key changes

**3. "Access denied" error**
- Use the appropriate API key for the endpoint
- Admin endpoints require the admin API key

**4. Server not responding**
- Check if the server is running
- Verify the port number
- Check server logs for errors

## 📞 Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify your API key is correct
3. Test with the API key management interface
4. Check the health endpoint for server status

---

**🔑 Your LinQrius API is now secure and ready for production use!**

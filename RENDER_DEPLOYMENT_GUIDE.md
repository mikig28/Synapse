# Render Deployment Guide - Search Functionality Fix

## Overview
This guide helps you deploy the search functionality fixes to your Render.com services.

## Services Architecture on Render

```
Frontend Service (Static Site)
    ↓ API calls
Backend Service (Web Service)  
    ↓ Vector queries
ChromaDB (External or Render Service)
    ↓ Metadata storage  
MongoDB Atlas (External Database)
```

## Deployment Steps

### 1. Backend Service Configuration

#### Environment Variables in Render Dashboard
Set these in your Backend service → Environment tab:

```bash
# Database (Required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/synapse
JWT_SECRET=your-production-jwt-secret-min-32-chars

# Search Configuration (Required)
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key

# Optional: Alternative embedding providers
GEMINI_API_KEY=your_gemini_api_key
VOYAGE_API_KEY=your_voyage_api_key

# Vector Database
CHROMA_URL=http://localhost:8000
# Or if you deploy ChromaDB separately: https://your-chromadb.onrender.com

# Production Settings
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-app.onrender.com

# Rate Limiting & Tracking
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
USAGE_TRACKING_ENABLED=true
```

#### Build Command (Backend)
```bash
npm install --legacy-peer-deps && npm run build
```

#### Start Command (Backend)
```bash
npm start
```

### 2. Frontend Service Configuration

#### Environment Variables in Render Dashboard
Set these in your Frontend service → Environment tab:

```bash
# Backend API URL
VITE_BACKEND_ROOT_URL=https://your-backend-app.onrender.com

# Build optimizations
NODE_ENV=production
```

#### Build Command (Frontend)
```bash
npm install && npm run build
```

#### Publish Directory (Frontend)
```
dist
```

### 3. Database Setup

#### MongoDB Atlas (Recommended)
1. Sign up at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a cluster
3. Get connection string
4. Add to `MONGODB_URI` in backend environment variables
5. Whitelist Render IP ranges or use `0.0.0.0/0` for all IPs

#### ChromaDB Options

**Option A: Include in Backend Service (Simpler)**
- ChromaDB will run alongside your backend
- Use `CHROMA_URL=http://localhost:8000`
- May need larger instance type

**Option B: Separate ChromaDB Service**
- Create new Render Web Service for ChromaDB
- Use Dockerfile or Python runtime
- Set `CHROMA_URL=https://your-chromadb.onrender.com`

### 4. Search Service Health Check

Add to your backend health check endpoint:

```javascript
// In your backend health check route
app.get('/api/v1/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'checking...',
      vectorDb: 'checking...'
    }
  };

  try {
    // Check MongoDB connection
    await mongoose.connection.db.admin().ping();
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'error';
  }

  try {
    // Check ChromaDB connection
    await vectorDatabaseService.healthCheck();
    health.services.vectorDb = 'connected';
  } catch (error) {
    health.services.vectorDb = 'error';
  }

  res.json(health);
});
```

### 5. Frontend Configuration Update

Update your axios config for production:

```typescript
// src/frontend/src/services/axiosConfig.ts
export const BACKEND_ROOT_URL = 
  import.meta.env.VITE_BACKEND_ROOT_URL || 
  'https://your-backend-app.onrender.com'; // Replace with your actual URL
```

## Deployment Checklist

### Before Pushing to Git:
- [ ] Updated SearchPage.tsx with better error handling ✅
- [ ] Created .env.example with all required variables ✅  
- [ ] Added startup scripts for local development ✅
- [ ] Updated CORS configuration for production

### In Render Dashboard:
- [ ] Set all required environment variables
- [ ] Configure build and start commands
- [ ] Set up MongoDB Atlas connection
- [ ] Configure CORS_ORIGIN to frontend URL
- [ ] Test health check endpoint

### After Deployment:
- [ ] Verify backend health at `https://your-backend.onrender.com/api/v1/health`
- [ ] Test search functionality in frontend
- [ ] Check browser console for any CORS errors
- [ ] Monitor logs for any connection issues

## Common Render Issues & Solutions

### Issue: "Search service not found"
**Solution:** Check `VITE_BACKEND_ROOT_URL` in frontend environment variables

### Issue: "CORS policy error"  
**Solution:** Set `CORS_ORIGIN=https://your-frontend-app.onrender.com` in backend

### Issue: "MongoDB connection failed"
**Solution:** Verify MongoDB Atlas connection string and IP whitelist

### Issue: "ChromaDB timeout"
**Solution:** Ensure ChromaDB service is running and accessible

### Issue: Backend won't start
**Solution:** Check environment variables, especially `MONGODB_URI` and `JWT_SECRET`

## Performance Optimization for Render

### Cold Start Mitigation
```javascript
// Add keep-alive endpoint
app.get('/api/v1/keepalive', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});
```

### Caching Strategy
- Enable Redis for session caching
- Cache search results for common queries
- Use CDN for static assets

## Monitoring & Logs

### Check Logs in Render:
1. Go to your service dashboard
2. Click "Logs" tab
3. Look for search-related errors

### Key Log Messages to Monitor:
- `[VectorDB]: ChromaDB initialized successfully`
- `[UniversalSearch] Found X results`
- MongoDB connection errors
- CORS errors

## Security Considerations

### Environment Variables Security:
- Never commit `.env` files
- Use strong JWT secrets (32+ characters)
- Rotate API keys regularly
- Use MongoDB Atlas network security

### API Rate Limiting:
- Configure rate limits in environment variables
- Monitor usage patterns
- Set up alerts for unusual activity

## Support & Troubleshooting

If search still fails after deployment:

1. **Check Render Logs:** Service → Logs tab
2. **Test Health Endpoint:** `curl https://your-backend.onrender.com/api/v1/health`
3. **Verify Environment Variables:** Service → Environment tab
4. **Check Browser Console:** F12 → Console for frontend errors
5. **Test Backend Directly:** Use Postman/curl to test search API

## Next Steps

1. Push changes to your repository
2. Deploy will trigger automatically on Render
3. Configure environment variables in Render dashboard
4. Test search functionality
5. Monitor logs for any issues

The improved error handling will now provide clear feedback about any configuration issues!
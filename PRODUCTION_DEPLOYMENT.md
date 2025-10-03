# Synapse Production Deployment Guide

## 🎯 Overview

This guide covers deploying Synapse to production with the following architecture:
- **Frontend:** Render.com (Static Site or Web Service)
- **Backend:** Render.com (Web Service)
- **CrewAI Service:** Render.com (Separate Web Service)
- **WAHA Service:** Railway.app (WhatsApp integration)
- **Database:** MongoDB Atlas (or Render Postgres/MongoDB)

## ✅ Pre-Deployment Checklist

### Critical Fixes Implemented
- ✅ Database connection pooling (handles 100+ concurrent users)
- ✅ Global and endpoint-specific rate limiting
- ✅ Circuit breakers for external services (WAHA, CrewAI)
- ✅ Winston structured logging (Render-compatible)
- ✅ Environment variable validation with Zod
- ✅ CORS whitelist (no wildcards)
- ✅ JWT secret validation (no fallback)
- ✅ Request correlation IDs for distributed tracing
- ✅ Compression middleware
- ✅ Comprehensive health check endpoints

### Required Environment Variables

#### Backend Service (.env)
```bash
# REQUIRED - Application will not start without these
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/synapse
JWT_SECRET=<generate-32-char-secret>  # MUST be 32+ characters
JWT_EXPIRES_IN=7d

# REQUIRED - AI Services
ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>

# REQUIRED - Frontend URL for CORS
FRONTEND_URL=https://your-frontend.onrender.com

# REQUIRED - External Services
CREWAI_SERVICE_URL=https://your-crewai.onrender.com
WAHA_SERVICE_URL=https://your-waha.up.railway.app
WAHA_API_KEY=<your-waha-key>

# Optional but Recommended
GEMINI_API_KEY=<your-key>
VOYAGE_API_KEY=<your-key>
PINECONE_API_KEY=<your-key>
LOG_LEVEL=info  # Options: error, warn, info, http, debug
```

## 🚀 Render.com Deployment

### Backend Service Setup

1. **Create New Web Service**
   - Go to Render Dashboard → New → Web Service
   - Connect your GitHub repository
   - Select branch: `main` (or your production branch)

2. **Service Configuration**
   ```yaml
   Name: synapse-backend
   Region: Oregon (or closest to your users)
   Branch: main
   Runtime: Node
   Build Command: cd src/backend && npm install --legacy-peer-deps && npm run build
   Start Command: cd src/backend && npm start
   ```

3. **Instance Type** ⚠️ CRITICAL
   - **Minimum:** Starter ($7/month) - Required to avoid cold starts
   - **Recommended:** Standard ($25/month) - Better performance
   - **DO NOT USE FREE TIER** - Causes 60s cold start cascade failures

4. **Environment Variables**
   - Add all required env vars from the checklist above
   - **Generate Strong JWT Secret:**
     ```bash
     openssl rand -base64 32
     ```
   - Set `RENDER=true` for container detection

5. **Health Check Path**
   ```
   Path: /health
   Expected Status: 200
   ```

6. **Auto-Deploy**
   - Enable auto-deploy on `main` branch

### CrewAI Service Setup

1. **Create Separate Web Service**
   ```yaml
   Name: synapse-crewai
   Region: Same as backend (Oregon)
   Branch: main
   Runtime: Python (or Node based on your CrewAI implementation)
   Build Command: cd src/backend/services/crewai-agents && pip install -r requirements.txt
   Start Command: cd src/backend/services/crewai-agents && python app.py
   ```

2. **Instance Type**
   - **Minimum:** Starter ($7/month)
   - **Recommended:** Standard ($25/month) - AI processing is CPU-intensive

3. **Environment Variables**
   ```bash
   OPENAI_API_KEY=<same-as-backend>
   ANTHROPIC_API_KEY=<same-as-backend>
   ```

4. **Update Backend**
   - Copy CrewAI service URL
   - Set `CREWAI_SERVICE_URL` in backend env vars

### Frontend Service Setup

1. **Create Static Site (recommended) or Web Service**
   ```yaml
   Name: synapse-frontend
   Region: Oregon (same as backend for low latency)
   Branch: main
   Build Command: cd src/frontend && npm install && npm run build
   Publish Directory: src/frontend/dist
   ```

2. **Environment Variables**
   ```bash
   VITE_BACKEND_URL=https://synapse-backend.onrender.com
   VITE_FRONTEND_URL=https://synapse-frontend.onrender.com
   ```

3. **Custom Domain (Optional)**
   - Add your domain in Render settings
   - Update `FRONTEND_URL` in backend to match

## 🚂 Railway.app WAHA Service Deployment

### WAHA Service Setup

1. **Create New Project**
   - Go to Railway Dashboard → New Project
   - Deploy from GitHub or Docker image

2. **Service Configuration**
   - If using WAHA Docker image:
     ```
     Image: devlikeapro/waha:latest
     Port: 3000
     ```

3. **Environment Variables**
   ```bash
   WAHA_API_KEY=<generate-secure-key>
   WAHA_ENGINE=NOWEB  # or WEBJS
   WAHA_NOWEB_STORE_ENABLED=true
   WAHA_NOWEB_STORE_FULLSYNC=true
   ```

4. **Get Public URL**
   - Railway auto-generates a URL: `your-service.up.railway.app`
   - Copy this URL
   - Set `WAHA_SERVICE_URL` in backend env vars

5. **Resource Allocation**
   - **Memory:** 2GB minimum
   - **Cost:** ~$5-10/month depending on usage

## 📊 MongoDB Atlas Setup

1. **Create Cluster**
   - Go to MongoDB Atlas
   - Create a free tier cluster (M0) or paid cluster
   - Choose region closest to your Render region

2. **Database Configuration**
   - Database name: `synapse`
   - Create database user with read/write permissions

3. **Network Access**
   - **CRITICAL:** Allow access from anywhere (0.0.0.0/0)
   - Render uses dynamic IPs, cannot whitelist specific IPs

4. **Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/synapse?retryWrites=true&w=majority
   ```
   - Copy this and set as `MONGODB_URI` in backend env vars

5. **Indexes** (after first deployment)
   - Run from MongoDB Compass or shell:
   ```javascript
   db.whatsappmessages.createIndex({ userId: 1, timestamp: -1 });
   db.whatsappmessages.createIndex({ chatId: 1, timestamp: -1 });
   db.tasks.createIndex({ userId: 1, status: 1, dueDate: 1 });
   db.notes.createIndex({ userId: 1, createdAt: -1 });
   ```

## 🔧 Post-Deployment Configuration

### 1. Verify Services

```bash
# Check backend health
curl https://synapse-backend.onrender.com/health

# Check detailed health (includes WAHA + CrewAI status)
curl https://synapse-backend.onrender.com/api/v1/health/detailed

# Check CrewAI health
curl https://synapse-crewai.onrender.com/health

# Check WAHA health
curl https://your-waha.up.railway.app/health \
  -H "X-Api-Key: your-waha-key"
```

### 2. Monitor Logs

**Render Logs:**
- Go to service → Logs tab
- Look for structured JSON logs (Winston format)
- Check for any errors during startup

**Common startup log patterns:**
```json
{"level":"info","message":"Starting Synapse Backend","nodeEnv":"production","port":3001}
{"level":"info","message":"Database connected","readyState":1}
{"level":"info","message":"CORS allowed origins","origins":["https://..."]}
```

### 3. Test Critical Flows

1. **Authentication**
   ```bash
   # Register user
   curl -X POST https://synapse-backend.onrender.com/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

2. **WhatsApp (if WAHA configured)**
   - Check QR code endpoint
   - Verify message sync

3. **AI Agents**
   - Run a test agent
   - Monitor CrewAI service logs

## 🛡️ Security Checklist

- [ ] JWT_SECRET is 32+ characters and randomly generated
- [ ] CORS is configured with specific origins (no wildcards)
- [ ] MongoDB network access configured properly
- [ ] API keys stored in Render environment variables (not in code)
- [ ] WAHA_API_KEY is strong and unique
- [ ] Rate limiting enabled (100 req/min global)
- [ ] HTTPS enabled on all services (Render provides this automatically)

## 📈 Monitoring & Alerts

### Uptime Monitoring (Free Options)

1. **UptimeRobot** (recommended)
   - Monitor all 3 services (Backend, CrewAI, WAHA)
   - Check every 5 minutes
   - Alert via email/Slack when down

2. **Better Uptime**
   - More detailed monitoring
   - Status page generation

### Log Monitoring

1. **Render Logs**
   - Real-time logs in dashboard
   - Download logs for analysis

2. **Sentry** (recommended for production)
   ```bash
   # Install in backend
   npm install --save @sentry/node

   # Add to server.ts
   import * as Sentry from '@sentry/node';

   Sentry.init({ dsn: process.env.SENTRY_DSN });
   ```

### Performance Monitoring

1. **Render Metrics**
   - CPU usage
   - Memory usage
   - Request count
   - Response time

2. **Custom Metrics**
   - Use `/api/v1/health/detailed` endpoint
   - Monitor circuit breaker states
   - Track database connection pool usage

## 🐛 Troubleshooting

### Cold Start Issues (Render Free Tier)

**Symptom:** First request takes 60-90 seconds
**Solution:** Upgrade to Starter plan ($7/month)

**Temporary Workaround:**
- Use cron-job.org to ping `/health` every 10 minutes
- Keeps service warm

### CORS Errors

**Symptom:** Browser console shows CORS policy errors
**Check:**
1. `FRONTEND_URL` matches actual frontend URL (including https://)
2. Backend logs show allowed origins
3. Request has `Origin` header

### Database Connection Failures

**Symptom:** `readyState: 0` in health check
**Check:**
1. MongoDB Atlas network access allows 0.0.0.0/0
2. `MONGODB_URI` is correct
3. Database user has proper permissions

### WAHA Service Unavailable

**Symptom:** Health check shows `waha: { status: 'unavailable' }`
**Check:**
1. Railway service is running
2. `WAHA_SERVICE_URL` is correct
3. `WAHA_API_KEY` matches between services
4. Railway has not run out of credits

### Circuit Breaker Opens

**Symptom:** Logs show `Circuit breaker OPENED for <service>`
**Meaning:** External service (WAHA/CrewAI) is down or timing out
**Action:**
1. Check external service health
2. Wait 30-45 seconds for circuit to retry (HALF_OPEN state)
3. If service is healthy, circuit will close automatically

## 💰 Cost Breakdown

### Minimum Production Setup
- **Backend (Render Starter):** $7/month
- **CrewAI (Render Starter):** $7/month
- **Frontend (Render Static):** $0 (free)
- **WAHA (Railway):** ~$5-10/month
- **MongoDB Atlas (M0):** $0 (free tier)
- **Total:** ~$19-24/month

### Recommended Production Setup
- **Backend (Render Standard):** $25/month
- **CrewAI (Render Standard):** $25/month
- **Frontend (Render Static):** $0
- **WAHA (Railway):** ~$10/month
- **MongoDB Atlas (M10):** $57/month
- **Sentry (Team):** $26/month
- **Total:** ~$143/month

## 🚀 Scaling Recommendations

### 100-1,000 Users
- Backend: Standard instance
- Database: M10 cluster (10GB)
- Add Redis for caching (Upstash/Render)

### 1,000-10,000 Users
- Backend: Pro instance or multiple Standard instances
- Database: M30 cluster (40GB)
- Add CDN (Cloudflare) for static assets
- Implement queue system (Bull/BullMQ with Redis)

### 10,000+ Users
- Backend: Multiple Pro instances with load balancer
- Database: M50+ cluster with read replicas
- Separate AI processing to dedicated instances
- Implement caching layer (Redis cluster)
- Consider Kubernetes for orchestration

## 📞 Support & Resources

- **Render Docs:** https://render.com/docs
- **Railway Docs:** https://docs.railway.app
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com
- **WAHA Docs:** https://github.com/devlikeapro/waha

## 🎉 Success Criteria

Your deployment is successful when:
- [ ] All health checks return 200
- [ ] Frontend loads without errors
- [ ] User can register and login
- [ ] Database queries work
- [ ] WhatsApp integration functional (if configured)
- [ ] AI agents execute successfully
- [ ] No circuit breakers in OPEN state
- [ ] Response times < 2 seconds for most endpoints
- [ ] Memory usage stable (not constantly increasing)

# Quick Start - Testing Production-Ready Changes

This guide helps you test the new production-ready infrastructure locally before deploying.

## 🚀 Quick Test (5 minutes)

### 1. Update Environment Variables

```bash
# Copy the updated .env.example
cp .env.example .env

# Edit .env and set these REQUIRED variables:
MONGODB_URI=mongodb://localhost:27017/synapse  # Or your MongoDB Atlas URI
JWT_SECRET=$(openssl rand -base64 32)          # Generate secure secret
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
FRONTEND_URL=http://localhost:5173
```

### 2. Install New Dependencies

```bash
cd src/backend
npm install --legacy-peer-deps
```

**New packages installed:**
- `winston` - Production logging
- `express-rate-limit` - Rate limiting
- `opossum` - Circuit breakers
- `compression` - Response compression

### 3. Start the Server

```bash
# From src/backend directory
npm run dev
```

### 4. Verify It's Working

**Expected startup logs:**
```json
{"level":"info","message":"Starting Synapse Backend","nodeEnv":"development","port":3001}
{"level":"info","message":"CORS allowed origins","origins":["http://localhost:5173",...]}
{"level":"info","message":"Database connected","readyState":1}
```

### 5. Test Health Checks

```bash
# Quick health check (for load balancers)
curl http://localhost:3001/health

# Expected: {"status":"ok"}

# Detailed health check
curl http://localhost:3001/api/v1/health/detailed

# Expected: Full status with database, services, memory info
```

## ✅ What Changed?

### Environment Validation
**Before:** Server starts even if critical vars are missing
**Now:** Server exits with clear error message

**Test it:**
```bash
# Temporarily remove JWT_SECRET from .env
# Start server
npm run dev

# Expected output:
❌ Environment variable validation failed:
  • JWT_SECRET: Required
```

### Rate Limiting
**Before:** Unlimited requests
**Now:** 100 requests/minute per IP globally

**Test it:**
```bash
# Make 101 requests rapidly
for i in {1..101}; do curl http://localhost:3001/health; done

# 101st request should return:
# {"success":false,"error":"Too many requests...","retryAfter":"1 minute"}
```

### Structured Logging
**Before:** `console.log` everywhere
**Now:** Winston structured JSON logs

**Test it:**
```bash
# Watch logs while making a request
npm run dev

# Make authenticated request
curl http://localhost:3001/api/v1/tasks \
  -H "Authorization: Bearer your_token"

# Expected log format:
{"level":"http","message":"Incoming request","method":"GET","path":"/api/v1/tasks","requestId":"..."}
```

### CORS Whitelist
**Before:** Accepts requests from any origin
**Now:** Only whitelisted origins

**Test it:**
```bash
# Request from unauthorized origin
curl http://localhost:3001/api/v1/tasks \
  -H "Origin: https://evil.com"

# Expected: CORS error
```

### Request Correlation IDs
**Before:** No way to trace requests across services
**Now:** Every request has unique ID

**Test it:**
```bash
# Make request and check response headers
curl -I http://localhost:3001/health

# Expected header:
# X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

## 🔍 Common Issues & Solutions

### Issue: Server won't start - "JWT_SECRET: Required"
**Solution:** Set `JWT_SECRET` in .env with 32+ characters
```bash
# Generate secure secret
openssl rand -base64 32
```

### Issue: "CORS error" in browser console
**Solution:** Set `FRONTEND_URL` in backend .env to match frontend URL
```bash
# For local development
FRONTEND_URL=http://localhost:5173

# For production
FRONTEND_URL=https://your-frontend.onrender.com
```

### Issue: Database connection fails
**Solution:**
1. Check MongoDB is running: `mongod --version`
2. Verify `MONGODB_URI` in .env
3. For MongoDB Atlas: Ensure IP whitelist includes your IP

### Issue: "Rate limit exceeded" during development
**Solution:** Rate limits are per-IP. If testing locally, you can:
1. Wait 1 minute between test runs
2. Restart server (resets counters)
3. Temporarily increase limits in `src/backend/src/middleware/rateLimiter.ts`

## 📊 Testing Checklist

Before deploying to production, verify:

- [ ] Server starts without errors
- [ ] `/health` returns `{"status":"ok"}`
- [ ] `/api/v1/health/detailed` shows all services
- [ ] User registration works
- [ ] User login returns JWT token
- [ ] Protected endpoints require authentication
- [ ] Rate limiting triggers on 101st request
- [ ] Logs are structured JSON format
- [ ] Request IDs appear in logs and responses
- [ ] CORS blocks unauthorized origins

## 🎯 Next Steps

Once local testing passes:

1. **Review Changes**
   - Read `PRODUCTION_CHANGES.md` for full details
   - Understand what each change does

2. **Update Production Environment**
   - Set all required env vars in Render dashboard
   - Generate new JWT secret (32+ chars)
   - Set `FRONTEND_URL` to production URL

3. **Deploy**
   - Follow `PRODUCTION_DEPLOYMENT.md` guide
   - Start with backend service
   - Then deploy frontend
   - Finally configure external services (WAHA, CrewAI)

4. **Monitor**
   - Setup UptimeRobot for all services
   - Check Render logs for errors
   - Test all critical user flows

## 🛠️ Development Tips

### Viewing Logs in Development

```bash
# Colorized console output (development)
npm run dev

# JSON format (like production)
LOG_LEVEL=info NODE_ENV=production npm run dev
```

### Testing Circuit Breakers

```bash
# Circuit breaker will open if external service fails
# To test, temporarily set wrong WAHA URL:
WAHA_SERVICE_URL=https://invalid-url.com npm run dev

# Make WhatsApp request
# Circuit breaker will open after 5 failures
# Check logs for: "Circuit breaker OPENED for WAHA Service"
```

### Testing Rate Limiting on Specific Endpoints

```bash
# AI endpoints: 10 req/min
for i in {1..11}; do
  curl http://localhost:3001/api/v1/agents -H "Authorization: Bearer token"
done

# Agent execution: 5 req per 5 min
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/v1/agents/execute
done
```

## 📖 Further Reading

- `PRODUCTION_CHANGES.md` - Detailed list of all changes
- `PRODUCTION_DEPLOYMENT.md` - Complete deployment guide
- `src/backend/src/config/logger.ts` - Logger configuration
- `src/backend/src/config/env.ts` - Environment validation
- `src/backend/src/middleware/rateLimiter.ts` - Rate limit rules
- `src/backend/src/config/circuitBreakers.ts` - Circuit breaker config

---

**Ready for Production?** Follow `PRODUCTION_DEPLOYMENT.md` next! 🚀

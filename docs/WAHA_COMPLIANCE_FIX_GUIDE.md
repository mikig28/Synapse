# WAHA Compliance Fix Guide

## Overview

This guide documents the critical fixes applied to align our WhatsApp integration with official WAHA documentation (https://waha.devlike.pro/docs/).

**Status**: ✅ Backend code fixes completed
**Action Required**: Update WAHA service environment variables

---

## 🔧 Backend Code Fixes (COMPLETED)

### 1. Messages API Endpoint ✅
**Issue**: Using non-standard endpoint format
**Fixed**: Changed from `/api/messages?session={session}&chatId={chatId}` to `/api/{session}/chats/{chatId}/messages`
**Impact**: Messages will now load correctly

### 2. QR Code API Endpoints ✅
**Issue**: Inconsistent endpoint formats
**Fixed**: Standardized all QR endpoints to `/api/{session}/auth/qr?format=image`
**Impact**: More reliable QR code generation

### 3. Session Status Cache ✅
**Issue**: Returning stale cached data causing infinite timeout loops
**Fixed**:
- Clear cache on 404 errors
- Clear cache before state transitions
- Only use recent cache (<5s old) on non-404 errors
**Impact**: Real-time session status, no more STARTING timeout loops

---

## ⚠️ WAHA Service Environment Updates (ACTION REQUIRED)

You need to update these environment variables in your **WAHA service** on Render.com/Railway:

### Critical Changes

#### 1. Engine Variable Name ❌ WRONG → ✅ CORRECT

```bash
# ❌ WRONG (Currently in your environment)
WAHA_ENGINE=WEBJS

# ✅ CORRECT (Official WAHA variable)
WHATSAPP_DEFAULT_ENGINE=WEBJS
```

**Action**:
1. Go to WAHA service on Render.com/Railway
2. Delete `WAHA_ENGINE` variable
3. Add `WHATSAPP_DEFAULT_ENGINE=WEBJS`

#### 2. MongoDB URL Format ❌ WRONG → ✅ CORRECT

```bash
# ❌ WRONG (Database name at end)
WHATSAPP_SESSIONS_MONGO_URL=mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/waha_sessions?retryWrites=true&w=majority&appName=Cluster0

# ✅ CORRECT (NO database name, just host:port/)
WHATSAPP_SESSIONS_MONGO_URL=mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

**Action**: Update `WHATSAPP_SESSIONS_MONGO_URL` to remove `/waha_sessions` part

⚠️ **IMPORTANT NOTE**: MongoDB storage is DEPRECATED in WAHA. Consider migrating to PostgreSQL for better long-term support.

#### 3. Remove Quotes from URLs

```bash
# ❌ WRONG (Has quotes)
WHATSAPP_SESSIONS_MONGO_URL="mongodb+srv://..."

# ✅ CORRECT (No quotes)
WHATSAPP_SESSIONS_MONGO_URL=mongodb+srv://...
```

**Action**: Ensure no quotes around environment variable values in Render.com dashboard

---

## 📋 Complete WAHA Service Environment Checklist

After fixes, your WAHA service should have:

```bash
# ✅ Core Configuration
WHATSAPP_DEFAULT_ENGINE=WEBJS             # Correct variable name
WAHA_ZIPPER=ZIPUNZIP                      # Required for WEBJS + storage
WAHA_WEBJS_CACHE_TYPE=local               # Performance optimization

# ✅ Session Storage (MongoDB - DEPRECATED but still supported)
WHATSAPP_SESSIONS_MONGO_URL=mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# ✅ Browser Configuration
CHROME_PATH=/usr/bin/chromium
PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --no-zygote --disable-gpu --disable-features=VizDisplayCompositor --disable-accelerated-2d-canvas"

# ✅ Performance
NODE_OPTIONS="--max-old-space-size=2048"
WAHA_BROWSER_TIMEOUT=120000
WAHA_PROTOCOL_TIMEOUT=180000

# ✅ API Settings
WAHA_API_KEY=waha-synapse-2025-secure
WAHA_PRINT_QR=false
WAHA_LOG_LEVEL=info
```

---

## 🚀 Migration Steps

### Step 1: Deploy Backend Code Changes
The backend code fixes are already committed. Just deploy:
```bash
git pull origin main
# Backend will auto-deploy on Render.com
```

### Step 2: Update WAHA Service Environment

**On Render.com/Railway WAHA Service Dashboard**:

1. Navigate to Environment Variables
2. **Delete**: `WAHA_ENGINE`
3. **Add**: `WHATSAPP_DEFAULT_ENGINE=WEBJS`
4. **Update**: `WHATSAPP_SESSIONS_MONGO_URL` (remove `/waha_sessions` from end)
5. **Remove quotes** from all URL values
6. Click "Save Changes"
7. **Restart WAHA service**

### Step 3: Delete Existing Sessions (Clean Start)

After environment updates:
1. Go to WAHA Dashboard or use API: `DELETE /api/sessions/{sessionName}`
2. This ensures fresh session with correct configuration
3. Reconnect by scanning QR code

### Step 4: Test

1. **Test QR Generation**: Should appear within 5-10 seconds
2. **Test Message Loading**: Should load messages without 422/timeout errors
3. **Monitor Logs**: Check for "Using MongoDB storage" confirmation

---

## 🔍 Verification

### Expected Behavior After Fixes

#### QR Code Generation:
```
[WAHA Service] Session 'u_xxx' current state: STARTING
[WAHA Service] Session 'u_xxx' current state: SCAN_QR_CODE  ← Should transition quickly!
[WAHA Service] ✅ QR code generated successfully
```

#### Message Loading:
```
[WAHA Service] GET /api/u_xxx/chats/chatId/messages  ← Correct endpoint!
[WAHA Service] Received 50 messages
```

#### Session Persistence:
```
[WAHA] Using MongoDB storage: mongodb+srv://...
[WAHA] Session restored from storage
[WAHA] WebJS state: CONNECTED (restored in 2s)  ← Fast reconnect!
```

---

## 🐛 Troubleshooting

### Issue: Still Getting 422 Errors

**Check**:
1. Is `WHATSAPP_DEFAULT_ENGINE=WEBJS` set? (not `WAHA_ENGINE`)
2. Is MongoDB URL format correct? (no `/database_name` at end)
3. Did you restart WAHA service after env changes?

### Issue: QR Code Timeout

**Check**:
1. Are environment variables saved without quotes?
2. Is `WAHA_ZIPPER=ZIPUNZIP` set?
3. Try deleting session and recreating fresh

### Issue: Messages Still Not Loading

**Check**:
1. Backend deployed with latest code? (check git commit)
2. Session status is `WORKING`? (not `STARTING` or `SCAN_QR_CODE`)
3. Check backend logs for API endpoint being called

---

## 📚 Reference Documentation

- **Official WAHA Docs**: https://waha.devlike.pro/docs/
- **Sessions API**: https://waha.devlike.pro/docs/how-to/sessions/
- **Chats API**: https://waha.devlike.pro/docs/how-to/chats/
- **Storage Config**: https://waha.devlike.pro/docs/how-to/storages/
- **Engine Comparison**: https://waha.devlike.pro/docs/how-to/engines/

---

## ⚠️ Important Notes

### MongoDB Deprecation

MongoDB storage is officially **DEPRECATED** in WAHA. From official docs:

> "MongoDB storage is deprecated and no new features will be added to it. We recommend using PostgreSQL for new installations."

**Recommendation**: Plan migration to PostgreSQL:
```bash
WHATSAPP_SESSIONS_POSTGRES_URL=postgresql://user:password@host:port/waha_sessions
```

### WAHA Core vs Plus

You're currently running **WAHA Core (free version)**, NOT WAHA Plus:
- ✅ Core features work (QR, messages, chats)
- ❌ No Plus-specific features (advanced media handling, etc.)
- 💡 Requires `WAHA_API_KEY` for basic auth (not a Plus license)

---

## 🎯 Expected Outcomes

After completing this guide:

1. ✅ QR codes generate within 5-10 seconds
2. ✅ Messages load without 422/timeout errors
3. ✅ Sessions persist across WAHA restarts (no 5-15 min re-sync)
4. ✅ No more infinite `STARTING` state loops
5. ✅ Clean, compliant WAHA API integration

---

**Last Updated**: 2025-01-10
**WAHA Version Tested**: 2025.9.x
**Backend Fixes Committed**: Yes ✅
**Environment Updates Required**: Yes ⚠️

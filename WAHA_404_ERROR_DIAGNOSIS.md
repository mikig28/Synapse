# WAHA 404 Error - Diagnosis and Solution

## Problem Summary

Images and media files from WhatsApp are failing to download with **404 errors**.

### Error Details:
```
Request failed with status code 404
URL: https://waha-synapse-production.up.railway.app/api/files/u_6828510b49ea/3AA07355...
```

## Root Cause

**The production backend is using the wrong WAHA service URL.**

### Current (Incorrect) Configuration:
```
WAHA_SERVICE_URL=https://waha-synapse-production.up.railway.app
```

### Correct Configuration:
```
WAHA_SERVICE_URL=https://synapse-waha.onrender.com
```

## Evidence

1. **Logs show Railway URL being used:**
   ```
   url: 'https://waha-synapse-production.up.railway.app/api/files/...'
   ```

2. **Railway service returns 404:**
   ```bash
   curl https://waha-synapse-production.up.railway.app/api/sessions/u_6828510b49ea
   # Returns: {"status":"error","code":404,"message":"Application not found"}
   ```

3. **Correct URL is documented in `.env.example`:**
   ```
   WAHA_SERVICE_URL=https://synapse-waha.onrender.com
   WAHA_API_KEY=waha-synapse-2025-secure
   ```

## Solution

### Update Production Environment Variables

On your production deployment platform (Render.com backend):

1. **Navigate to**: Backend service environment variables
2. **Update**: `WAHA_SERVICE_URL` to `https://synapse-waha.onrender.com`
3. **Verify**: `WAHA_API_KEY` is set to `waha-synapse-2025-secure`
4. **Redeploy**: The backend service

### How to Update on Render.com:

1. Go to https://dashboard.render.com/
2. Select your **synapse-backend** service
3. Go to **Environment** tab
4. Find `WAHA_SERVICE_URL` variable
5. Change value from:
   ```
   https://waha-synapse-production.up.railway.app
   ```
   To:
   ```
   https://synapse-waha.onrender.com
   ```
6. Click **Save Changes**
7. Backend will auto-redeploy

## Verification

After updating and redeploying, test by:

1. **Sending an image to a monitored WhatsApp group**
2. **Check backend logs** - should see:
   ```
   [WhatsAppMediaService] Downloading media for message ...
   url: 'https://synapse-waha.onrender.com/api/files/...'
   [WhatsAppMediaService] Successfully downloaded media
   ```
3. **Check frontend** - image should appear in group monitor

## Additional Notes

### Why This Happened:
- The WAHA service was initially deployed on Railway
- It was later moved to Render.com for better stability
- Production environment variables weren't updated to reflect the migration

### Related Environment Variables:
```bash
# WAHA Service Configuration
WAHA_SERVICE_URL=https://synapse-waha.onrender.com
WAHA_API_KEY=waha-synapse-2025-secure
WAHA_ENGINE=WEBJS  # or NOWEB

# Session Storage (if using MongoDB)
WHATSAPP_SESSIONS_MONGO_URL=mongodb://user:password@host:port/
WAHA_ZIPPER=ZIPUNZIP  # Required for WEBJS + MongoDB
```

## Impact

**Current Status**:
- ❌ Image downloads failing
- ❌ Voice note downloads failing
- ❌ Document downloads failing
- ✅ Text messages working
- ✅ URL bookmark detection working

**After Fix**:
- ✅ All media types will download correctly
- ✅ Face recognition will work on images
- ✅ Voice transcription will work
- ✅ Group monitor features fully operational

---

**Date**: 2025-10-15
**Status**: 🔴 Environment Configuration Issue - Requires Manual Update
**Priority**: High - Blocks all media processing features

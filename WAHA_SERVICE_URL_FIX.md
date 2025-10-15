# WAHA Service Media URL Configuration Fix

## Problem

WAHA service is generating incorrect media file URLs in webhook payloads, causing all media downloads to fail with 404 errors.

### Current Behavior:
```
WAHA Service Running At: https://synapse-waha.onrender.com ✅
Media URLs Generated: https://waha-synapse-production.up.railway.app/api/files/... ❌
```

### Expected Behavior:
```
WAHA Service Running At: https://synapse-waha.onrender.com ✅
Media URLs Generated: https://synapse-waha.onrender.com/api/files/... ✅
```

## Root Cause

The WAHA service is not configured with its correct base URL, so it generates file URLs using an old/incorrect domain.

## Solution

### Option 1: Update WAHA Service Environment Variables (Recommended)

1. Go to https://dashboard.render.com/
2. Find the **WAHA service** deployment (e.g., `synapse-waha`)
3. Navigate to **Environment** tab
4. Add/Update the following environment variable:
   ```
   WAHA_BASE_URL=https://synapse-waha.onrender.com
   ```
   Or try:
   ```
   BASE_URL=https://synapse-waha.onrender.com
   ```
   Or:
   ```
   WEBHOOK_URL=https://synapse-waha.onrender.com
   ```
5. Click **Save Changes**
6. Service will auto-redeploy

### Option 2: Update WAHA Docker Configuration

If WAHA is deployed via Docker, update the docker-compose.yml or Dockerfile with:

```yaml
environment:
  - WAHA_BASE_URL=https://synapse-waha.onrender.com
  # OR
  - BASE_URL=https://synapse-waha.onrender.com
```

### Option 3: Check WAHA Configuration File

WAHA may have a configuration file where the base URL is set. Check for files like:
- `.waha.json`
- `config.json`
- Environment-specific config files

Update the base URL in those files if present.

## Verification Steps

After updating the WAHA service configuration:

### 1. Check WAHA Service Info
```bash
curl https://synapse-waha.onrender.com/api/sessions/u_6828510b49ea \
  -H "X-Api-Key: waha-synapse-2025-secure"
```

Should return session info without 404.

### 2. Send Test Media Message
Send an image to a monitored WhatsApp group and check the webhook payload.

### 3. Check Backend Logs
Look for media URL in logs - should now show:
```
mediaUrl: 'https://synapse-waha.onrender.com/api/files/u_6828510b49ea/...'
```

### 4. Verify Download
Backend should successfully download the media:
```
[WhatsAppMediaService] Successfully downloaded media
```

## WAHA Documentation Reference

According to WAHA documentation (https://waha.devlike.pro):

**Environment Variables for File Storage:**
- `WAHA_FILES_FOLDER`: Where files are stored
- `WAHA_FILES_LIFETIME`: How long files are kept
- Base URL configuration varies by deployment method

## Alternative: Direct Media Download

If WAHA file URLs continue to fail, we can modify the backend to use WAHA's direct download endpoint instead:

**Current Flow:**
1. WAHA sends webhook with pre-generated file URL
2. Backend downloads from that URL
3. ❌ URL is wrong, download fails

**Alternative Flow:**
1. WAHA sends webhook with message ID
2. Backend calls WAHA API: `GET /api/{session}/messages/{messageId}/media`
3. ✅ Direct download from WAHA API

### Code Change Required (If Alternative Needed)

In `wahaService.ts`, modify the media download logic to call:
```typescript
const response = await axios.get(
  `${this.wahaBaseUrl}/api/${sessionName}/messages/${messageId}/media`,
  {
    headers: { 'X-Api-Key': this.wahaApiKey },
    responseType: 'arraybuffer'
  }
);
```

## Current Status

✅ Backend is correctly configured: `https://synapse-waha.onrender.com`
✅ Backend can send messages successfully
❌ WAHA generates wrong media URLs: `https://waha-synapse-production.up.railway.app`
❌ Media downloads fail with 404

## Expected After Fix

✅ WAHA generates correct URLs: `https://synapse-waha.onrender.com/api/files/...`
✅ Media downloads succeed
✅ Images appear in group monitor
✅ Voice notes transcribe successfully
✅ All monitor features operational

---

**Priority**: 🔴 Critical - Blocks all media processing
**Next Step**: Update WAHA service environment variable `WAHA_BASE_URL`
**Date**: 2025-10-15

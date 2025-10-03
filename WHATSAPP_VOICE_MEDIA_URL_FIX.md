# WhatsApp Voice Messages - Media URL Configuration Fix

## Problem

WAHA downloads voice files successfully to `/tmp/whatsapp-files/` but doesn't provide HTTP URLs for the backend to access them. This causes:

```
mediaUrl: 'none'
localPath: null
❌ Cannot transcribe - no file available
```

## Root Cause

WAHA service is missing environment variables to expose media files via HTTP. Without these, WAHA saves files internally but doesn't generate public URLs.

## Solution: Add WAHA Environment Variables on Railway

### 1. Go to Railway Dashboard

1. Open your **waha-synapse** service (not backend)
2. Click on **"Variables"** tab

### 2. Add These Environment Variables

```bash
# Media URL Configuration
WAHA_BASE_URL=https://waha-synapse-production.up.railway.app
WHATSAPP_API_HOSTNAME=waha-synapse-production.up.railway.app
WHATSAPP_API_SCHEMA=https
WHATSAPP_API_PORT=443

# Enable file downloads via HTTP
WAHA_DOWNLOAD_MEDIA=PLAIN
```

### 3. Redeploy WAHA Service

After adding variables:
1. Click **"Deploy"** to restart WAHA with new configuration
2. Wait for deployment to complete (2-3 minutes)

## How It Works

With these variables:

1. **Before**: WAHA saves to `/tmp/whatsapp-files/file.oga` (not accessible)
2. **After**: WAHA provides `https://waha-synapse-production.up.railway.app/api/files/file.oga`
3. Backend downloads from URL → transcribes → creates task/note

## Test After Deployment

Send a voice memo to "פתק 2" WhatsApp group.

**Expected logs:**
```
[WAHA Service] Received 10 messages
[WAHA Service] Processing media message with URL: https://waha...
[WAHA Service] ✅ Media downloaded successfully
[WAHA Service] 🎙️ ===== STARTING VOICE TRANSCRIPTION =====
[WAHA Service] 🎙️ ===== TRANSCRIPTION SUCCESSFUL =====
[WAHA Service] ✅ Created task in Synapse
```

## Alternative: Use WAHA Webhooks (Better Approach)

Instead of polling, use webhooks which include media URLs:

### In WAHA Variables:
```bash
WHATSAPP_HOOK_URL=https://synapse-backend-7lq6.onrender.com/api/v1/waha/webhook
WHATSAPP_HOOK_EVENTS=message,message.any
WHATSAPP_HOOK_MEDIA=true
```

This way, WAHA pushes messages WITH media URLs to your backend instantly!

## Why This Happens

Railway services run in separate containers:
- **waha-synapse** container has files in `/tmp/whatsapp-files/`
- **synapse-backend** container can't access another container's filesystem
- Solution: WAHA must expose files via HTTP URLs

## References

- WAHA Media Docs: https://waha.devlike.pro/docs/how-to/media/
- WAHA Environment Vars: https://waha.devlike.pro/docs/how-to/config/


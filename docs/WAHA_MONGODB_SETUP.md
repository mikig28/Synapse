# WAHA MongoDB Session Storage Setup Guide

## Overview

To prevent 5-15 minute chat sync delays every time your WAHA service restarts, you need to configure MongoDB session storage. This allows WAHA to persist WhatsApp Web authentication and chat data across restarts.

## Problem Without MongoDB Storage

- Every restart = full re-sync of all chats (5-15 minutes)
- 110-second timeouts when fetching chats during initial sync
- Session data lost on container restart

## Solution: MongoDB Persistent Storage

Configure WAHA to use MongoDB for session storage. This ensures:
- ✅ Instant reconnection after restarts (no re-sync needed)
- ✅ No more 110-second timeouts
- ✅ Sessions persist across deployments

## Step-by-Step Setup

### Option 1: Use Your Existing Synapse MongoDB (Recommended)

You already have a MongoDB instance configured for Synapse. Reuse it for WAHA:

1. **Get your MongoDB connection string** from your backend `.env`:
   ```bash
   MONGODB_URI=mongodb://user:password@host:port/synapse
   ```

2. **Add to WAHA service environment variables** on Render.com:

   Go to: https://dashboard.render.com → Select `synapse-waha` service → Environment

   Add these variables:
   ```bash
   # Required: MongoDB connection URL with database name
   WHATSAPP_SESSIONS_MONGO_URL=mongodb://user:password@host:port/waha_sessions

   # Required for WEBJS + MongoDB
   WAHA_ZIPPER=ZIPUNZIP

   # Optional: Cache for faster loads
   WAHA_WEBJS_CACHE_TYPE=local
   ```

   **Note**: Use a DIFFERENT database name (`waha_sessions`) than your main app (`synapse`) to keep data separate.

3. **Restart WAHA service** on Render.com

### Option 2: Use MongoDB Atlas Free Tier

If you want separate storage for WAHA:

1. Create free MongoDB Atlas cluster: https://www.mongodb.com/cloud/atlas/register

2. Get connection string from Atlas dashboard

3. Add to WAHA environment variables on Render.com:
   ```bash
   WHATSAPP_SESSIONS_MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/waha_sessions

   WAHA_ZIPPER=ZIPUNZIP
   WAHA_WEBJS_CACHE_TYPE=local
   ```

### Option 3: Local Storage (NOT Recommended for Production)

Only use for testing. Sessions will be lost on every container restart:

```bash
WAHA_LOCAL_STORE_BASE_DIR=/app/.sessions
```

## Verification

After configuration, check WAHA logs on Render.com:

### ✅ Success indicators:
```
[WAHA] Using MongoDB storage: mongodb://...
[WAHA] Session restored from storage
[WAHA] WebJS state: CONNECTED (restored in 2s)
```

### ❌ Problems to look for:
```
[WAHA] MongoDB connection failed
[WAHA] Using local storage (will be lost on restart)
```

## Environment Variables Reference

Add these to **WAHA service** (not your backend):

```bash
# REQUIRED - MongoDB connection
WHATSAPP_SESSIONS_MONGO_URL=mongodb://user:password@host:port/waha_sessions

# REQUIRED for WEBJS + MongoDB
WAHA_ZIPPER=ZIPUNZIP

# OPTIONAL - Performance improvements
WAHA_WEBJS_CACHE_TYPE=local                    # Browser cache
WAHA_WEBJS_WEB_VERSION=2.3000.1028213955       # Pin WhatsApp Web version
WAHA_WEBJS_PUPPETER_ARGS=--single-process      # Resource optimization
```

## Expected Results

### Before MongoDB Storage:
- Restart WAHA → Wait 5-15 minutes for full sync → Chats available
- Frontend shows "Initializing..." for 5-15 minutes
- 110-second timeout errors

### After MongoDB Storage:
- Restart WAHA → Wait 5-10 seconds to restore session → Chats available immediately
- Frontend shows "Connected" within seconds
- No timeout errors

## Troubleshooting

### "Still seeing long sync times"

1. Check WAHA logs for "Using MongoDB storage" message
2. Verify `WAHA_ZIPPER=ZIPUNZIP` is set
3. Ensure MongoDB URL has correct database name
4. Try deleting existing session and re-authenticating

### "MongoDB connection error"

1. Verify MongoDB URL is correct
2. Check MongoDB allows connections from Render.com IPs
3. Ensure database user has read/write permissions

### "Session not persisting"

1. Confirm `WHATSAPP_SESSIONS_MONGO_URL` includes database name
2. Check WAHA service has write permissions to MongoDB
3. Verify `WAHA_ZIPPER=ZIPUNZIP` is set (required for WEBJS)

## Security Notes

- ⚠️ Never commit MongoDB credentials to git
- ⚠️ Use environment variables only
- ⚠️ Consider using separate MongoDB database for WAHA
- ⚠️ Enable MongoDB authentication
- ⚠️ Use strong passwords

## Next Steps

1. Configure MongoDB URL in WAHA service environment
2. Add `WAHA_ZIPPER=ZIPUNZIP`
3. Restart WAHA service
4. Authenticate once with QR code
5. Test by restarting WAHA - should reconnect in seconds

---

**Documentation**: https://waha.devlike.pro/docs/how-to/config/

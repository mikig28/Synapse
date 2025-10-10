# WhatsApp WAHA Integration Fix Summary

## 🔍 Root Cause Analysis

### Primary Issue: NOWEB Store Not Enabled
The WAHA service was returning **400 Bad Request** errors for all `/chats` endpoints with this message:

```
"Enable NOWEB store 'config.noweb.store.enabled=True' and 'config.noweb.store.full_sync=True'
when starting a new session."
```

### Secondary Issue: Session Encryption Corruption
The existing session had corrupted encryption keys causing continuous decryption errors:
- `Error: Invalid public key`
- `Error: error:1C800064:Provider routines::bad decrypt`

## ✅ Fix Applied

### Code Changes in `src/backend/src/services/wahaService.ts`

**Added NOWEB Store Configuration (Line 943-953)**:
```typescript
// NOWEB engine REQUIRES explicit store configuration to retrieve chats/contacts
// See: https://waha.devlike.pro/docs/engines/noweb#store
if (engine === 'NOWEB') {
  createPayload.config.noweb = {
    store: {
      enabled: true,
      fullSync: true // Get max 1 year of history (up to 100k messages per chat)
    }
  };
  console.log(`[WAHA Service] 🔧 Enabled NOWEB store for chat/contact retrieval`);
}
```

**Also added to fallback session creation path (Line 1050-1058)**

### What This Fixes
- ✅ Enables chat/contact retrieval for NOWEB engine
- ✅ Stores up to 1 year of message history (max 100k messages per chat)
- ✅ Allows `/chats`, `/groups`, and `/contacts` endpoints to work properly
- ✅ Future sessions will be created with proper configuration

## 🚀 Deployment Steps

### Option 1: Automatic (Recommended)
The existing session will be automatically recreated with the new configuration on next backend restart:

```bash
# On Render.com
cd src/backend
npm run build
# Then restart the backend service via Render dashboard
```

### Option 2: Manual Session Recreation (If needed)
If the automatic recreation doesn't work, you can manually delete the session via WAHA API:

```bash
# Delete corrupted session
curl -X DELETE https://synapse-waha.onrender.com/api/sessions/u_6828510b49ea \
  -H "X-Api-Key: your_waha_api_key"

# Restart backend to create new session with proper config
```

### Option 3: Via Backend API (Safest)
The backend has a `recreateSessionWithEngine()` method that will:
1. Stop the current session
2. Delete the session
3. Create a new one with NOWEB store enabled

## 📊 Expected Results After Fix

### Before Fix
```
[WAHA API] ❌ 400 /api/u_6828510b49ea/chats
Error: "Enable NOWEB store config.noweb.store.enabled=True"
```

### After Fix
```
[WAHA API] ✅ 200 /api/u_6828510b49ea/chats
[WAHA Service] Received X chats
[WAHA Service] 🔧 Enabled NOWEB store for chat/contact retrieval
```

## 🔧 Verification Steps

1. **Check Backend Logs** for:
   ```
   [WAHA Service] 🔧 Enabled NOWEB store for chat/contact retrieval
   ```

2. **Check WAHA Service Logs** for:
   ```
   {"config":{"noweb":{"store":{"enabled":true,"fullSync":true}}}}
   ```

3. **Test Frontend**:
   - Navigate to WhatsApp Group Monitor page
   - Click "Refresh" on private chats
   - Click "Refresh" on groups
   - Both should now load data instead of showing "0/0"

4. **Check for Decryption Errors**:
   - Should no longer see "Invalid public key" errors
   - Should no longer see "bad decrypt" errors

## 📚 Technical Details

### NOWEB Engine Requirements
From WAHA documentation (https://waha.devlike.pro/docs/engines/noweb#store):

- **Default**: `config.noweb.store.enabled = false` (chats/contacts NOT stored)
- **Required**: Must be set to `true` when creating session
- **Important**: Cannot be changed after QR scan (would lose chat history)
- **fullSync**:
  - `false` = ~3 months history
  - `true` = ~1 year history (max 100k messages per chat)

### Why This Wasn't Caught Earlier
The backend code had incorrect comments saying:
```typescript
// No manual "store.enabled" flags needed - they don't exist in WAHA Plus API
```

This was true for WEBJS engine but **NOT for NOWEB engine**. The NOWEB engine requires explicit store configuration.

## 🎯 Next Actions

### Immediate
- [x] Code fix applied to wahaService.ts
- [ ] Deploy backend to Render.com
- [ ] Restart backend service
- [ ] Verify session recreates with NOWEB store enabled
- [ ] Test chat/contact loading in frontend

### Monitoring
Watch for these log messages to confirm success:
1. Backend: `[WAHA Service] 🔧 Enabled NOWEB store for chat/contact retrieval`
2. WAHA: `{"config":{"noweb":{"store":{"enabled":true}}}}`
3. Backend: `[WAHA Service] Received X chats` (where X > 0)

### If Issues Persist
1. Check environment variable: `WAHA_ENGINE=NOWEB` (should be set)
2. Check WAHA service status: `GET https://synapse-waha.onrender.com/api/version`
3. Manually delete session and let backend recreate it
4. Check WAHA service logs for startup errors

## 📝 Lessons Learned

1. **Engine-Specific Configuration**: Different WAHA engines (NOWEB vs WEBJS) have different requirements
2. **Documentation > Assumptions**: Always check official docs when errors provide specific instructions
3. **Error Messages Are Your Friend**: The WAHA error message explicitly told us what config was missing
4. **Session State Corruption**: Once encryption keys are corrupted, session must be recreated
5. **Configuration Validation**: Should add tests to verify required engine configs are present

## 🔗 References

- WAHA NOWEB Store Docs: https://waha.devlike.pro/docs/engines/noweb#store
- WAHA Engine Comparison: https://waha.devlike.pro/docs/how-to/engines/
- WAHA API Documentation: https://waha.devlike.pro/docs/overview/introduction

---

**Fixed by**: Claude Code
**Date**: 2025-10-10
**Related Files**:
- `src/backend/src/services/wahaService.ts` (lines 943-953, 1050-1058)

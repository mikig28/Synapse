# RESTART BACKEND NOW

## The Problem

Your backend service has **cached** the old session status (`u_6828510b49ea: STARTING`).

Even though we deleted the session from WAHA, the backend still thinks it exists because it's using **in-memory cache**.

## The Fix

Restart the backend service to clear cache and force it to create a fresh session.

## Steps

### Option 1: Render Dashboard (Recommended - 5 minutes)

1. Go to: https://dashboard.render.com/
2. Find service: **synapse-backend** (srv-cvcqj75ds78s73aipnpg)
3. Click "**Manual Deploy**"
4. Select "**Clear build cache & deploy**"
5. Wait ~5 minutes for deploy to complete

### Option 2: Quick Restart (30 seconds but risky)

**WARNING**: This forcefully restarts without rebuild. Use only if desperate.

1. Go to: https://dashboard.render.com/
2. Find service: **synapse-backend**
3. Settings → "**Suspend**" (wait 10 seconds)
4. Click "**Resume**"
5. Wait ~30 seconds for service to restart

## After Restart

1. Wait 2 minutes for backend to fully initialize
2. Go to: https://synapse-frontend.onrender.com
3. Refresh page (Ctrl+F5)
4. Click "Connect WhatsApp"
5. QR code should appear within 10-15 seconds ✅

## Why This Happens

```javascript
// Backend code caches session status
private sessionCache = new Map<string, SessionStatus>();

// When you request WhatsApp connection:
getSessionStatus('u_6828510b49ea')
  → Returns cached: { status: 'STARTING' } ❌ (old cache)
  → Should fetch fresh: 404 (session doesn't exist)
  → Should create new session
```

After restart:
```javascript
// Cache is cleared (empty memory)
private sessionCache = new Map<string, SessionStatus>(); // EMPTY

// When you request WhatsApp connection:
getSessionStatus('u_6828510b49ea')
  → Cache miss, fetches from WAHA
  → Gets 404 (session doesn't exist)
  → Creates NEW fresh session ✅
  → Returns: { status: 'SCAN_QR_CODE' }
```

## Verification

After backend restarts, check logs for:

```
[Server] ✅ All background services initialized successfully
[SessionManager] Using user-specific session for 6828510b49ea27a15a2226c0 (WAHA PLUS)
[WAHA Service] Creating new session 'u_6828510b49ea'... ✅
[WAHA API] POST /api/sessions {"name":"u_6828510b49ea",...}
[WAHA Webhook] session.status → SCAN_QR_CODE ✅
```

**NOT**:
```
❌ [WAHA Service] Session 'u_6828510b49ea' current state: STARTING (cached)
❌ [WAHA API] ❌ 404 /api/sessions/u_6828510b49ea
```

## Timeline

```
Backend restart:          0 min
Backend initializing:     2 min
Frontend refresh:         2 min
Click "Connect":          2 min
Session creates:          2 min + 5 sec
QR code appears:          2 min + 15 sec ✅
```

**Total**: ~2-3 minutes from restart to QR code

---

**DO THIS NOW**: Restart backend via Render dashboard!

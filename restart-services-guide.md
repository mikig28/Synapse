# Fix MongoDB "primary marked stale" Error After M2 Upgrade

## The Problem
MongoDB upgraded from M0 → M2, replica set elected new primary.
Your services have cached connections to old primary.

## The Solution
Restart all services to force reconnection to new primary.

## Option 1: Manual Restart (Recommended)

### Restart Backend
1. Go to: https://dashboard.render.com/web/srv-cvcqj75ds78s73aipnpg
2. Click "Manual Deploy" → "Clear build cache & deploy"
3. Wait ~5 minutes for deploy to complete

### Restart WAHA
1. Go to: https://dashboard.render.com/web/srv-d02t0ovqf0us73bhqij0
2. Click "Manual Deploy" → "Clear build cache & deploy"  
3. Wait ~3 minutes for deploy to complete

### Restart Frontend (if needed)
1. Go to: https://dashboard.render.com/static/srv-cvcqjltds78s73aipnr0
2. Click "Manual Deploy" → "Clear build cache & deploy"
3. Wait ~2 minutes for deploy to complete

## Option 2: Wait (5-10 minutes)
Services will auto-reconnect on their own after connection timeout.

## Verification

### Check Backend
```bash
curl https://synapse-backend-7lq6.onrender.com/api/v1/auth/health
# Should show: "database": { "connected": true }
```

### Check WAHA
```bash
curl https://synapse-waha.onrender.com/api/sessions \
  -H 'X-API-Key: waha-synapse-2025-secure'
# Should return sessions array (not 500 error)
```

## Why This Happens

MongoDB replica sets have:
- Primary server (handles writes)
- Secondary servers (handle reads)

During M0 → M2 upgrade:
1. MongoDB creates new replica set
2. New primary elected
3. Old connections become "stale"
4. Services need to reconnect

This is normal and only happens once during upgrades.

## Expected Timeline

- Restart services: ~5 minutes
- Services reconnect: ~30 seconds after restart
- WhatsApp working: Immediately after reconnection

## After Restart

You should be able to:
✅ Login to frontend
✅ Connect WhatsApp (QR code)
✅ Session persists (no repeated QR scans!)
✅ Messages load properly
✅ All writes work

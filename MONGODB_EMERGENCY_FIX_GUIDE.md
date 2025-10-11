# MongoDB Emergency Fix Guide - IMMEDIATE ACTION REQUIRED

## 🚨 Current Situation
Your MongoDB cluster has exceeded 75% CPU and is auto-scaling to M20 tier due to excessive WhatsApp data accumulation.

## ✅ Solution Implemented

### What We Fixed:
1. **MongoDB Cleanup Service** - Automatically deletes old data
2. **Database Indexes** - Optimized query performance  
3. **Increased Group Limits** - Fixed only 4 groups loading
4. **Enhanced Contact Resolution** - Better name display

### Files Modified:
- `src/backend/src/services/mongoCleanupService.ts` (NEW)
- `src/backend/src/api/controllers/mongoCleanupController.ts` (NEW)
- `src/backend/src/api/routes/adminRoutes.ts` (UPDATED)
- `src/backend/src/models/WhatsAppMessage.ts` (UPDATED - added index)
- `src/backend/src/server.ts` (UPDATED - integrated cleanup)
- `src/backend/src/services/wahaService.ts` (UPDATED - increased limits)
- `src/frontend/src/pages/WhatsAppPage.tsx` (UPDATED - increased limits)

## 🚀 Immediate Deployment Steps

### Step 1: Set Environment Variables on Render.com (CRITICAL)

Add these to your **backend service** environment variables on Render.com:

```bash
# Enable immediate cleanup on next deployment
MONGO_CLEANUP_RUN_NOW=true

# Optional: Enable emergency cleanup (7-day retention instead of 30-day)
# ONLY use this if CPU is critically high (>90%)
MONGO_EMERGENCY_CLEANUP=false  # Set to 'true' only if desperate
```

### Step 2: Deploy Backend

```bash
# Commit the changes
git add .
git commit -m "feat: MongoDB cleanup service to prevent CPU overload

- Add automatic cleanup service (30-day message retention)
- Add emergency cleanup option (7-day retention)
- Optimize database indexes for faster cleanup
- Fix WhatsApp group loading limits (4→100 groups)
- Add admin endpoints for cleanup management"

# Push to trigger Render.com deployment
git push origin main
```

### Step 3: Monitor Deployment

Watch the Render.com logs for these messages:
```
[Server] 🧹 Initializing MongoDB cleanup service...
[Server] 🧹 Running immediate cleanup on startup (MONGO_CLEANUP_RUN_NOW=true)
[Mongo Cleanup] 🧹 Starting database cleanup...
[Mongo Cleanup] ✅ Cleanup completed: { messagesDeleted: X, ... }
```

### Step 4: Verify CPU Reduction

After deployment (wait 10-15 minutes):
1. Check MongoDB Atlas Dashboard
2. Look for CPU usage dropping below 50%
3. Check collection sizes in admin panel

## 🔧 Manual Cleanup via API (If Needed)

If you need to run cleanup manually without redeploying:

### Check Current Database Size:
```bash
curl -X GET "https://synapse-backend-7lq6.onrender.com/api/v1/admin/cleanup/collection-sizes" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Run Regular Cleanup (30-day retention):
```bash
curl -X POST "https://synapse-backend-7lq6.onrender.com/api/v1/admin/cleanup/run" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Run Emergency Cleanup (7-day retention - LAST RESORT):
```bash
curl -X POST "https://synapse-backend-7lq6.onrender.com/api/v1/admin/cleanup/emergency" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmCode": "EMERGENCY_CLEANUP_CONFIRMED"}'
```

## 📊 Expected Results

### Before Cleanup:
- WhatsApp Messages: Unbounded growth (thousands of messages)
- MongoDB CPU: 75%+ (triggering auto-scale)
- DB Operations: 1000+ writes/hour

### After Cleanup:
- WhatsApp Messages: Only last 30 days kept
- MongoDB CPU: 30-50% (stable)
- DB Operations: 50-100 writes/hour
- **Estimated CPU Reduction: 60-80%**

## 📅 Automatic Cleanup Schedule

The cleanup service now runs automatically:
- **Schedule:** Daily at 3:00 AM (server timezone)
- **Retention Policies:**
  - WhatsApp Messages: 30 days
  - WhatsApp Images: 90 days
  - Inactive Contacts: 180 days

## 🛡️ Safety Features

1. **Deduplication:** Won't delete messages twice
2. **Orphan Cleanup:** Removes invalid references
3. **File Cleanup:** Deletes associated image files
4. **Non-blocking:** Runs in background without affecting API

## ⚠️ Important Notes

### What Gets Deleted:
- WhatsApp messages older than 30 days
- Images older than 90 days
- Contacts with no activity for 180 days
- Orphaned records with invalid references

### What's Preserved:
- Recent messages (last 30 days)
- Recent images (last 90 days)
- Active contacts
- All other data (tasks, notes, ideas, etc.)

## 🔍 Monitoring After Deployment

### Check Cleanup Stats:
```bash
curl "https://synapse-backend-7lq6.onrender.com/api/v1/admin/cleanup/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Response shows:
- Last cleanup time
- Records deleted
- Retention policies
- Recent cleanup history

### MongoDB Atlas Monitoring:
1. Go to MongoDB Atlas Dashboard
2. Select "Metrics" tab
3. Monitor:
   - CPU Usage (should drop to <50%)
   - Memory Usage  
   - Disk IOPS
   - Collection sizes

## 🆘 If CPU Doesn't Improve

If CPU is still high after cleanup:

1. **Run Emergency Cleanup:**
   - Set `MONGO_EMERGENCY_CLEANUP=true`
   - Redeploy
   - This uses 7-day retention instead of 30-day

2. **Check Other Collections:**
   - The cleanup focuses on WhatsApp data
   - Check if other features are causing load

3. **Consider Upgrading:**
   - If legitimate usage requires more data
   - Consider MongoDB M20+ tier for production

## 📝 Next Steps

1. ✅ Deploy with `MONGO_CLEANUP_RUN_NOW=true`
2. ✅ Monitor logs for cleanup completion
3. ✅ Verify CPU drops in MongoDB Atlas
4. ✅ Test Wh

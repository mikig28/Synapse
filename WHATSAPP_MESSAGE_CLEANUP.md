# WhatsApp Message Cleanup Service

## Overview

Automatic cleanup service that removes old WhatsApp messages from MongoDB to prevent storage bloat and reduce database costs.

## Problem Solved

WhatsApp monitoring generates large amounts of message data:
- **17.76 MB** from 27,277 messages in test database
- Growing continuously as users monitor groups
- Free MongoDB Atlas tier (512 MB) fills up quickly
- Causes write failures when storage quota exceeded

## Solution

**WhatsAppMessageCleanupService** provides:
- ✅ Automatic daily cleanup of old messages
- ✅ Configurable retention period (default: 3 days)
- ✅ Runs on server startup (after 30-second delay)
- ✅ Admin API endpoints for manual control
- ✅ Preserves summaries for 30 days (longer than raw messages)

## Architecture

### Service Location
- **Service**: `src/backend/src/services/whatsappMessageCleanupService.ts`
- **Controller**: `src/backend/src/api/controllers/adminController.ts`
- **Routes**: `src/backend/src/api/routes/adminRoutes.ts`
- **Server Integration**: `src/backend/src/server.ts`

### Singleton Pattern
```typescript
const cleanupService = WhatsAppMessageCleanupService.getInstance();
cleanupService.initialize(); // Auto-schedules cleanup
```

### What Gets Cleaned

#### Messages (3-day retention by default)
- **Collection**: `whatsappmessages`
- **Filter**: `createdAt < (now - 3 days)`
- **Impact**: Frees ~650-700 bytes per message

#### Summaries (30-day retention)
- **Collection**: `whatsappgroupsummaries`
- **Filter**: `createdAt < (now - 30 days)`
- **Reason**: Summaries are valuable for historical context

#### What's NOT Cleaned
- ✅ WhatsApp session authentication data (`waha_webjs_*` databases)
- ✅ Contacts (`whatsappcontacts`)
- ✅ Images metadata (`whatsappimages`)
- ✅ Recent messages (within retention period)

## Configuration

### Environment Variables
```bash
# Message retention period (default: 3 days)
WHATSAPP_MESSAGE_RETENTION_DAYS=3

# Cleanup schedule (cron format, default: daily at 2 AM)
WHATSAPP_CLEANUP_SCHEDULE="0 2 * * *"
```

### Cron Schedule Format
```
# ┌───────────── minute (0 - 59)
# │ ┌───────────── hour (0 - 23)
# │ │ ┌───────────── day of month (1 - 31)
# │ │ │ ┌───────────── month (1 - 12)
# │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday=0)
# │ │ │ │ │
# * * * * *

"0 2 * * *"   # Daily at 2:00 AM
"0 */6 * * *" # Every 6 hours
"0 0 * * 0"   # Weekly on Sunday at midnight
```

## API Endpoints

### 1. Trigger Manual Cleanup
```bash
POST /api/v1/admin/whatsapp-cleanup
Authorization: Bearer <admin-jwt-token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "messagesDeleted": 15234,
    "summariesDeleted": 5,
    "spaceSavedMB": 10.67,
    "executionTimeMs": 2341
  },
  "message": "Cleanup complete: 15234 messages deleted, ~10.67 MB freed"
}
```

### 2. Get Cleanup Configuration
```bash
GET /api/v1/admin/whatsapp-cleanup/config
Authorization: Bearer <admin-jwt-token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "retentionDays": 3,
    "cleanupSchedule": "0 2 * * *"
  }
}
```

## Usage Examples

### Admin Dashboard Integration
```typescript
// Trigger manual cleanup
const response = await fetch('/api/v1/admin/whatsapp-cleanup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const { data } = await response.json();
console.log(`Freed ${data.spaceSavedMB} MB by deleting ${data.messagesDeleted} messages`);
```

### Check Configuration
```typescript
const response = await fetch('/api/v1/admin/whatsapp-cleanup/config', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const { data } = await response.json();
console.log(`Current retention: ${data.retentionDays} days`);
console.log(`Cleanup schedule: ${data.cleanupSchedule}`);
```

## Automatic Behavior

### On Server Startup
1. **30-second delay**: Allows app to fully initialize
2. **Initial cleanup**: Removes all old messages
3. **Schedule setup**: Registers daily cron job

### Daily Cleanup
- **When**: 2:00 AM local server time (configurable)
- **What**: Deletes messages older than retention period
- **Safety**: Won't run if already in progress

### Logging
```
[WhatsApp Cleanup] Initializing with 3-day retention
[WhatsApp Cleanup] Schedule: 0 2 * * *
[WhatsApp Cleanup] Running initial cleanup on startup...
[WhatsApp Cleanup] 🗑️ Starting cleanup (retention: 3 days)...
[WhatsApp Cleanup] Cutoff date: 2025-10-04T15:52:00.000Z
[WhatsApp Cleanup] ✅ Deleted 15234 old messages
[WhatsApp Cleanup] ✅ Deleted 5 old summaries
[WhatsApp Cleanup] 🎉 Cleanup complete!
[WhatsApp Cleanup] Messages deleted: 15234
[WhatsApp Cleanup] Space saved: ~10.67 MB
[WhatsApp Cleanup] Execution time: 2341ms
```

## MongoDB Impact

### Storage Calculation
- **Average message size**: ~700 bytes
- **10,000 messages**: ~6.87 MB
- **27,277 messages**: ~17.76 MB (current in database)

### Expected Savings (3-day retention)
If monitoring 10 groups with 100 messages/day each:
- **Daily accumulation**: 1,000 messages × 700 bytes = 700 KB/day
- **3-day retention**: 3 days × 700 KB = 2.1 MB active storage
- **Without cleanup**: Unlimited growth → storage crisis

### MongoDB Atlas Free Tier Benefits
- **Before**: 512 MB → fills in weeks
- **After**: Stable 2-3 MB for WhatsApp messages
- **Result**: Sustainable free tier usage

## Safety Features

### Concurrency Protection
```typescript
if (this.isRunning) {
  throw new Error('Cleanup already in progress');
}
```
- Only one cleanup runs at a time
- Prevents overlapping deletions

### Preserves Critical Data
- ✅ Session authentication (WAHA databases)
- ✅ Contact information
- ✅ Recent messages (within retention period)
- ✅ Summaries (30-day retention)

### Error Handling
```typescript
try {
  // Cleanup logic
} catch (error) {
  console.error('[WhatsApp Cleanup] ❌ Cleanup failed:', error);
  throw error;
} finally {
  this.isRunning = false; // Always release lock
}
```

## Testing

### Local Test
```bash
# Set short retention for testing
export WHATSAPP_MESSAGE_RETENTION_DAYS=1

# Start server
npm run dev

# Wait 30 seconds for initial cleanup
# Check logs for cleanup results
```

### Manual Trigger (Production)
```bash
curl -X POST https://synapse-backend-7lq6.onrender.com/api/v1/admin/whatsapp-cleanup \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Verify Results
```bash
# Before cleanup
node -e "require('mongodb').MongoClient.connect('mongodb://...', async (e,c) => {
  const count = await c.db('test').collection('whatsappmessages').countDocuments();
  console.log('Messages:', count);
});"

# After cleanup
# Run same command - should show fewer messages
```

## Monitoring

### Database Size Tracking
```bash
node check-mongodb-size.cjs
```

**Expected Output After Cleanup**:
```
📊 STORAGE USAGE BY DATABASE:

  test
    Size: 5.23 MB (50.2%)  ← Reduced from 17.76 MB

  waha_webjs_u_6828510b49ea
    Size: 477.84 MB (45.8%)  ← Unchanged (session auth)

📦 Total Usage: 485.12 MB / 512 MB
⚠️  94.8% of free tier limit used  ← Much better than 996%!
```

### Service Health
```typescript
const cleanupService = WhatsAppMessageCleanupService.getInstance();
const config = cleanupService.getConfig();

console.log('Retention:', config.retentionDays, 'days');
console.log('Next cleanup:', config.cleanupSchedule);
```

## Troubleshooting

### Cleanup Not Running
**Symptom**: No cleanup logs in console

**Causes**:
1. Service not initialized in `server.ts`
2. Schedule format invalid
3. Cleanup already running (locked)

**Solution**:
```bash
# Check server logs for initialization
grep "WhatsApp Cleanup" logs/server.log

# Verify schedule format
node -e "console.log(require('node-schedule').scheduleJob('0 2 * * *', () => {}))"

# Manually trigger via API
curl -X POST .../api/v1/admin/whatsapp-cleanup
```

### Messages Not Deleting
**Symptom**: Database size unchanged after cleanup

**Causes**:
1. All messages within retention period
2. MongoDB query failed
3. `createdAt` field missing

**Solution**:
```javascript
// Check message ages
db.whatsappmessages.aggregate([
  { $group: {
    _id: null,
    oldest: { $min: "$createdAt" },
    newest: { $max: "$createdAt" },
    count: { $sum: 1 }
  }}
])

// Check for missing timestamps
db.whatsappmessages.countDocuments({ createdAt: { $exists: false } })
```

### Cleanup Taking Too Long
**Symptom**: `executionTimeMs > 10000ms`

**Causes**:
1. Millions of messages
2. No index on `createdAt`
3. MongoDB Atlas throttling

**Solution**:
```javascript
// Add index for faster queries
db.whatsappmessages.createIndex({ createdAt: 1 })

// Increase retention period to reduce deletions
export WHATSAPP_MESSAGE_RETENTION_DAYS=7
```

## Migration from Manual Cleanup

### Before (Manual Process)
```bash
# Had to manually run cleanup scripts
node cleanup-waha-messages.cjs

# Required uncommenting code
# No scheduled automation
# Risk of forgetting
```

### After (Automated Service)
```typescript
// Runs automatically on:
// 1. Server startup (after 30s)
// 2. Daily at 2 AM (scheduled)
// 3. Manual admin trigger

// No manual intervention needed!
```

## Future Enhancements

### Planned Features
1. **Dynamic retention**: Adjust retention based on storage usage
2. **Per-group retention**: Different retention for different groups
3. **Archival**: Move old messages to S3 before deletion
4. **Analytics**: Track cleanup history and savings over time
5. **Alerts**: Notify admins when cleanup frees significant space

### Configuration UI
Future admin dashboard feature:
```
┌─────────────────────────────────────────┐
│ WhatsApp Message Cleanup Settings      │
├─────────────────────────────────────────┤
│ Retention Period: [3] days             │
│ Schedule: [0 2 * * *] (Daily 2 AM)     │
│                                         │
│ Last Cleanup: 2 hours ago               │
│ Messages Deleted: 15,234                │
│ Space Saved: 10.67 MB                   │
│                                         │
│ [Trigger Manual Cleanup]                │
└─────────────────────────────────────────┘
```

## Related Documentation

- **MongoDB Storage Crisis**: `MONGODB_STORAGE_CRISIS.md`
- **WhatsApp Architecture**: `CLAUDE.md` (WhatsApp section)
- **Admin API**: `src/backend/src/api/routes/adminRoutes.ts`

## Dependencies

- `node-schedule`: Cron job scheduling
- `@types/node-schedule`: TypeScript definitions
- `mongoose`: MongoDB ODM for deletions

---

**Implementation Complete**: 2025-10-07
**Status**: ✅ Production Ready
**Deployed**: Automatic on next backend deploy

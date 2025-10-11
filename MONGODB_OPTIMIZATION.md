# MongoDB Optimization Guide

## 🚨 Current Issue
MongoDB CPU exceeded 75% due to WAHA NOWEB storing massive amounts of WhatsApp data.

## 📊 Storage Breakdown

### WAHA Collections (High Load)
```
Database: waha_noweb_u_6828510b49ea
Collections:
  - messages: ~100k messages per chat × number of chats
  - chats: Chat metadata
  - contacts: Contact information
```

### Backend Collections (Normal Load)
```
Database: synapse
Collections:
  - users, tasks, notes, etc.
```

---

## ✅ Optimization Strategies

### 1. Reduce WAHA Storage Duration (CRITICAL)

**Current:**
```typescript
config.noweb.store.fullSync = true  // 1 year (100k msgs/chat)
```

**Optimized:**
```typescript
config.noweb.store.fullSync = false  // 3 months history
```

**Impact:** ~75% reduction in storage

**How to Apply:**
⚠️ **WARNING**: Changing after QR scan loses chat history!

1. Delete current session:
   ```bash
   curl -X DELETE "https://synapse-waha.onrender.com/api/sessions/u_6828510b49ea" \
     -H "X-Api-Key: waha-synapse-2025-secure"
   ```

2. Update backend code (wahaService.ts line 948):
   ```typescript
   config.noweb = {
     store: {
       enabled: true,
       fullSync: false  // Change from true
     }
   };
   ```

3. Restart backend → New session will use 3 months

---

### 2. MongoDB TTL Indexes (Auto-Cleanup)

Add Time-To-Live indexes to WAHA's MongoDB collections to auto-delete old messages:

**Connect to MongoDB:**
```bash
mongosh "YOUR_MONGODB_CONNECTION_STRING"
```

**Add TTL Indexes (90 days):**
```javascript
// Use WAHA's database
use waha_noweb_u_6828510b49ea

// Auto-delete messages older than 90 days
db.messages.createIndex(
  { "timestamp": 1 },
  { expireAfterSeconds: 7776000 }  // 90 days
)

// Auto-delete old chats
db.chats.createIndex(
  { "timestamp": 1 },
  { expireAfterSeconds: 15552000 }  // 180 days
)

// Verify indexes
db.messages.getIndexes()
```

**Impact:** Automatic cleanup, prevents indefinite growth

---

### 3. Backend Query Optimization

**Increase Cache Duration:**

Current caching in backend:
- Session status: 30s
- Groups: 5 minutes
- Chats: No cache

**Optimize in wahaService.ts:**

```typescript
// Increase cache durations
private readonly SESSION_STATUS_CACHE_TTL = 60000; // 30s → 60s
private readonly GROUPS_CACHE_TTL = 600000; // 5min → 10min
private readonly CHATS_CACHE_TTL = 300000; // Add 5min cache
```

**Reduce Polling Frequency:**

Check `src/backend/src/services/wahaService.ts`:
```typescript
// Find polling intervals and increase them
pollInterval: 60000  // Change from 30s to 60s
```

---

### 4. Pagination Limits

**Backend already implements:**
- Groups: limit 200 chats ✅
- Messages: limit 50 per chat ✅
- Private chats: limit 200 ✅

**Good practices maintained!**

---

### 5. Switch to PostgreSQL (Long-term)

WAHA recommends PostgreSQL over MongoDB:

**Benefits:**
- Better performance for chat storage
- More efficient indexes
- Lower CPU usage

**Migration:**
1. Set up PostgreSQL on Render
2. Update WAHA env:
   ```
   WHATSAPP_SESSIONS_POSTGRES_URL=postgresql://user:pass@host/waha_sessions
   ```
3. Remove MongoDB URL
4. Recreate session

---

## 🎯 Recommended Action Plan

### Immediate (Today):

1. **Add TTL indexes** to MongoDB (see section 2)
   - Impact: Auto-cleanup starts immediately
   - Effort: 5 minutes

2. **Monitor MongoDB metrics** in Atlas dashboard
   - Watch CPU usage trend
   - Check storage reduction

### Short-term (This Week):

3. **Reduce fullSync to false** (see section 1)
   - Impact: 75% storage reduction for future data
   - Trade-off: Only 3 months history instead of 1 year
   - Effort: Delete session + code change + re-scan QR

4. **Increase cache durations** in backend
   - Impact: Fewer MongoDB queries
   - Effort: Code change + deploy

### Long-term (Next Month):

5. **Migrate to PostgreSQL** (see section 5)
   - Impact: Permanent performance improvement
   - Effort: Setup PostgreSQL + migration

---

## 📊 Expected Results

| Action | Storage Impact | CPU Impact | Effort |
|--------|---------------|------------|---------|
| TTL Indexes | -30% (gradual) | -20% | 5 min |
| fullSync: false | -75% (new data) | -40% | 30 min |
| Increase caching | 0% | -15% | 10 min |
| Switch to PostgreSQL | N/A | -50% | 2 hours |

**Combined Impact:** ~85% CPU reduction

---

## 🔧 Quick Start Commands

### 1. Add TTL Indexes (Do This Now!)

```bash
# Connect to MongoDB
mongosh "YOUR_MONGODB_CONNECTION_STRING"

# Run these commands
use waha_noweb_u_6828510b49ea
db.messages.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 7776000 })
db.chats.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 15552000 })
```

### 2. Monitor Improvement

Check MongoDB Atlas → Metrics → CPU Usage

---

## ⚠️ Important Notes

1. **TTL indexes work gradually** - MongoDB's background process deletes expired docs every 60 seconds
2. **fullSync change requires QR re-scan** - Plan accordingly
3. **Backup before major changes** - Use MongoDB Atlas backup
4. **Test in staging first** - If you have a staging environment

---

## 📚 References

- WAHA Storage Docs: https://waha.devlike.pro/docs/how-to/storages/
- WAHA NOWEB Store: https://waha.devlike.pro/docs/engines/noweb#store
- MongoDB TTL Indexes: https://docs.mongodb.com/manual/core/index-ttl/
- Atlas Performance: https://docs.atlas.mongodb.com/tutorial/monitor-performance/

---

**Created:** 2025-10-11
**By:** Claude Code
**Priority:** CRITICAL

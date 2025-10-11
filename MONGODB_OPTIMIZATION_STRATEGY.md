# MongoDB Optimization Strategy - Urgent CPU Overload Fix

## Current Problem
MongoDB cluster has exceeded 75% CPU usage and is auto-scaling to M20 tier. This is caused by excessive database operations from the WhatsApp feature.

## Root Causes Identified

### 1. Unlimited Message Storage
- WhatsApp messages are being saved indefinitely without any cleanup
- With 21 groups receiving messages continuously, this grows exponentially
- No retention policy = unbounded growth

### 2. Inefficient Database Operations
- Individual message saves (one write per message)
- No batching of webhook events
- Frequent status checks creating read load
- Missing indexes on common query patterns

### 3. Duplicate/Redundant Data
- Messages might be saved multiple times (webhooks + polling)
- No deduplication logic
- Cache misses causing repeated DB reads

## Immediate Fixes Required

### Priority 1: Message Retention Policy (Implement First)
**Impact:** Will immediately reduce DB size and ongoing CPU load

Create a cleanup job that:
- Deletes WhatsApp messages older than 30 days
- Keeps only recent images (90 days)
- Runs daily at 3 AM
- Archives important messages before deletion (optional)

### Priority 2: Add Database Indexes
**Impact:** Reduces query time by 10-50x

Required indexes:
- `WhatsAppMessage`: `{ timestamp: -1, chatId: 1 }`
- `WhatsAppMessage`: `{ messageId: 1 }` (unique)
- `WhatsAppContact`: `{ phoneNumber: 1 }` (unique)
- `WhatsAppImage`: `{ userId: 1, extractedAt: -1 }`

### Priority 3: Batch Write Operations
**Impact:** Reduces write operations by 80%+

- Buffer webhook messages (collect for 5 seconds)
- Write in batches of 50
- Use `insertMany()` instead of individual `save()`

### Priority 4: Implement Caching Layer
**Impact:** Reduces read operations by 60%+

- Cache recent messages in Redis (or in-memory)
- Cache group lists for 5 minutes
- Cache contacts for 10 minutes

## Implementation Plan

### Step 1: Create Cleanup Service (30 min)
File: `src/backend/src/services/mongoCleanupService.ts`
- Delete old WhatsApp messages (30 days+)
- Delete old images (90 days+)
- Delete orphaned contacts
- Run via cron job

### Step 2: Add Indexes (5 min)
File: `src/backend/src/models/WhatsAppMessage.ts`
- Add schema indexes
- Create migration script

### Step 3: Batch Writes (1 hour)
File: `src/backend/src/services/wahaService.ts`
- Create message buffer
- Flush every 5 seconds or 50 messages
- Handle errors gracefully

### Step 4: Add Caching (1 hour)
File: `src/backend/src/services/whatsappCacheService.ts`
- In-memory cache (or Redis if available)
- TTL-based expiration
- Smart invalidation

## Estimated Impact

**Before Optimization:**
- 1000+ writes/hour (1 per message)
- 500+ reads/hour (status checks, group fetches)
- Unbounded DB growth
- No cleanup = permanent high CPU

**After Optimization:**
- 50-100 writes/hour (batched)
- 100-200 reads/hour (cached)
- Bounded DB size (30-day retention)
- Auto-cleanup = stable CPU usage

**Expected CPU Reduction:** 60-80%

## Quick Win: Disable Unnecessary Saves

The code already has this commented out:
```typescript
// Line 273 in wahaService.ts
console.warn('[WAHA Service] persistWAHAMessage: Temporarily disabled pending userId context from webhook routing');
return;
```

This is GOOD - it's preventing excessive writes. Keep this disabled until multi-user support is ready.

## Monitoring After Implementation

Add monitoring for:
1. DB write operations per hour
2. DB read operations per hour
3. Collection sizes (messages, images, contacts)
4. Cleanup job execution logs
5. Cache hit/miss ratios

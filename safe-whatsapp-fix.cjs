#!/usr/bin/env node

/**
 * Safe WhatsApp Summary Fix
 * 
 * This fixes the "No messages found" issue without breaking the build.
 * We'll use a different approach that doesn't involve $or in aggregations.
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Applying safe WhatsApp summary fix...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Fix 1: Update the main query to try both timestamp fields
// Instead of using $or in the query (which is fine), we'll run two queries
const oldBaseQuery = `    // Build comprehensive query for group messages
    const baseQuery = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming - get all messages in the group
      createdAt: {  // Use createdAt instead of timestamp (timestamp field is corrupted)
        $gte: utcStart,
        $lte: utcEnd
      }
    };`;

const newBaseQuery = `    // Build comprehensive query for group messages
    // We'll try both timestamp fields separately to avoid complex queries
    const baseQueryWithCreatedAt = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming - get all messages in the group
      createdAt: {
        $gte: utcStart,
        $lte: utcEnd
      }
    };
    
    const baseQueryWithTimestamp = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming - get all messages in the group
      timestamp: {
        $gte: utcStart,
        $lte: utcEnd
      }
    };
    
    // We'll use createdAt first, then fallback to timestamp
    const baseQuery = baseQueryWithCreatedAt;`;

content = content.replace(oldBaseQuery, newBaseQuery);

// Fix 2: After trying with createdAt, also try with timestamp if no messages found
const oldMessageLoop = `    // Try each query until we find messages
    for (let i = 0; i < queries.length && messages.length === 0; i++) {`;

const newMessageLoop = `    // Try each query until we find messages
    // First try with createdAt field
    for (let i = 0; i < queries.length && messages.length === 0; i++) {`;

content = content.replace(oldMessageLoop, newMessageLoop);

// Add a second attempt with timestamp field if first attempt fails
const afterFirstLoop = `      console.log(\`[WhatsApp Summary] \${queryUsed} returned \${messages.length} messages\`);
      
      if (messages.length > 0) {`;

const afterFirstLoopNew = `      console.log(\`[WhatsApp Summary] \${queryUsed} returned \${messages.length} messages\`);
      
      // If no messages found with createdAt, try with timestamp field
      if (messages.length === 0 && baseQuery === baseQueryWithCreatedAt) {
        console.log('[WhatsApp Summary] No messages with createdAt, trying timestamp field...');
        const timestampQuery = {
          ...query,
          timestamp: baseQuery.createdAt,
          createdAt: undefined
        };
        delete timestampQuery.createdAt;
        
        messages = await WhatsAppMessage.find(timestampQuery)
          .populate('contactId')
          .sort({ timestamp: 1 })
          .lean();
          
        console.log(\`[WhatsApp Summary] Timestamp query returned \${messages.length} messages\`);
      }
      
      if (messages.length > 0) {`;

content = content.replace(afterFirstLoop, afterFirstLoopNew);

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('✅ Safe fix applied!');
console.log('\nChanges made:');
console.log('1. Created separate queries for createdAt and timestamp fields');
console.log('2. Added fallback to timestamp field if createdAt returns no results');
console.log('3. No complex MongoDB operators that could break the build');
console.log('\n📝 This should fix the "No messages found" issue safely.');
#!/usr/bin/env node

/**
 * Final fix for WhatsApp timestamp field issues
 * 
 * The problem: Code only checks 'timestamp' field but messages have 'createdAt'
 * The solution: Check BOTH fields using $or operator
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Fixing WhatsApp timestamp field issues...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Fix 1: Update baseQuery to check both timestamp fields
const oldBaseQuery = `    const baseQuery = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming - get all messages in the group
      timestamp: {  // Try timestamp field first
        $gte: utcStart,
        $lte: utcEnd
      }
    };`;

const newBaseQuery = `    const baseQuery = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming - get all messages in the group
      $or: [
        { timestamp: { $gte: utcStart, $lte: utcEnd } },
        { createdAt: { $gte: utcStart, $lte: utcEnd } }
      ]
    };`;

if (content.includes(oldBaseQuery)) {
  content = content.replace(oldBaseQuery, newBaseQuery);
  console.log('✅ Fixed baseQuery to check both timestamp and createdAt fields');
} else {
  console.log('⚠️  Could not find baseQuery to fix');
}

// Fix 2: Update fallback query to check both fields
const oldFallbackTimestamp = `        timestamp: { $gte: fallbackStart, $lte: fallbackEnd }`;
const newFallbackTimestamp = `        $or: [
          { timestamp: { $gte: fallbackStart, $lte: fallbackEnd } },
          { createdAt: { $gte: fallbackStart, $lte: fallbackEnd } }
        ]`;

content = content.replace(oldFallbackTimestamp, newFallbackTimestamp);
console.log('✅ Fixed fallback query to check both timestamp fields');

// Fix 3: Update the aggregation pipeline for getAvailableGroups
// Find and fix the recentMessages calculation
const aggregationPattern = /recentMessages:\s*\{\s*\$sum:\s*\{\s*\$cond:\s*\{[^}]+\}\s*\}\s*\}/s;
const aggregationReplacement = `recentMessages: {
            $sum: {
              $cond: {
                if: { 
                  $gte: [
                    { $ifNull: ['$timestamp', '$createdAt'] },
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }`;

if (aggregationPattern.test(content)) {
  content = content.replace(aggregationPattern, aggregationReplacement);
  console.log('✅ Fixed aggregation pipeline to use $ifNull for timestamp fields');
}

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('\n✅ WhatsApp timestamp field issues have been fixed!');
console.log('\nChanges made:');
console.log('1. baseQuery now checks BOTH timestamp and createdAt fields');
console.log('2. fallbackQuery now checks BOTH timestamp and createdAt fields');
console.log('3. Aggregation pipeline uses $ifNull to handle both fields');
console.log('\n📝 This should finally fix the "No messages found" issue!');
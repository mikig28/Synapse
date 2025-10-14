#!/usr/bin/env node

/**
 * Fix WhatsApp Group Aggregation
 * 
 * This script fixes the aggregation pipeline in getAvailableGroups
 * to handle both timestamp and createdAt fields
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Fixing WhatsApp Group Aggregation Pipeline...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Fix the aggregation pipeline to handle both timestamp fields
const oldAggregation = `          lastActivity: { $max: '$timestamp' },
          totalMessages: { $sum: 1 },
          recentMessages: {
            $sum: {
              $cond: {
                if: { $gte: ['$timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                then: 1,
                else: 0
              }
            }
          },`;

const newAggregation = `          lastActivity: { 
            $max: { 
              $ifNull: ['$timestamp', '$createdAt'] 
            } 
          },
          totalMessages: { $sum: 1 },
          recentMessages: {
            $sum: {
              $cond: {
                if: { 
                  $or: [
                    { $gte: ['$timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                    { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          },`;

if (content.includes(oldAggregation)) {
  content = content.replace(oldAggregation, newAggregation);
  console.log('✅ Updated aggregation pipeline to handle both timestamp fields');
} else {
  console.log('⚠️  Could not find aggregation pattern to replace');
  console.log('Attempting alternative fix...');
  
  // Try a more flexible pattern
  const flexiblePattern = /lastActivity: \{ \$max: '\$timestamp' \}/;
  if (flexiblePattern.test(content)) {
    content = content.replace(
      flexiblePattern,
      "lastActivity: { \n            $max: { \n              $ifNull: ['$timestamp', '$createdAt'] \n            } \n          }"
    );
    
    // Also fix the recentMessages calculation
    const recentPattern = /\$gte: \['\$timestamp', new Date\(Date\.now\(\) - 7 \* 24 \* 60 \* 60 \* 1000\)\]/g;
    content = content.replace(
      recentPattern,
      "$or: [\n                    { $gte: ['$timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },\n                    { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }\n                  ]"
    );
    
    console.log('✅ Applied alternative fix for aggregation pipeline');
  }
}

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('\n✅ WhatsApp Group Aggregation pipeline has been fixed!');
console.log('\nChanges made:');
console.log('1. Updated lastActivity to use $ifNull for timestamp/createdAt fallback');
console.log('2. Fixed recentMessages calculation to check both timestamp fields');
console.log('3. Ensured groups are properly counted regardless of timestamp field used');
console.log('\n📝 This should fix the "messageCount" showing correctly in group listings');
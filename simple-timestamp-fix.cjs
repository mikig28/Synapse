#!/usr/bin/env node

/**
 * Simple Timestamp Field Fix
 * 
 * Just changes createdAt to timestamp in the queries
 * This is the safest possible fix
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Applying simple timestamp fix...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Simply change createdAt to timestamp in the base query
content = content.replace(
  'createdAt: {  // Use createdAt instead of timestamp (timestamp field is corrupted)',
  'timestamp: {  // Try timestamp field first'
);

content = content.replace(
  '.sort({ createdAt: 1 })  // Sort by createdAt since that has correct timestamps',
  '.sort({ timestamp: 1 })  // Sort by timestamp'
);

// Also fix the fallback query
content = content.replace(
  'createdAt: { $gte: fallbackStart, $lte: fallbackEnd }',
  'timestamp: { $gte: fallbackStart, $lte: fallbackEnd }'
);

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('✅ Simple fix applied!');
console.log('\nChanges made:');
console.log('1. Changed createdAt to timestamp in queries');
console.log('2. Updated sort to use timestamp');
console.log('3. Fixed fallback query to use timestamp');
console.log('\n📝 This is the simplest possible fix - just using timestamp field instead of createdAt.');
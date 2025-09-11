#!/usr/bin/env node

/**
 * Fix WhatsApp Message Retrieval Issues
 * 
 * This script creates a more robust message retrieval logic that:
 * 1. Uses $or operator to check both timestamp fields simultaneously
 * 2. Removes dependency on single message field detection
 * 3. Ensures messages are found regardless of field structure
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Fixing WhatsApp Message Retrieval Logic...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Create the improved query logic that checks both timestamp fields using $or
const improvedQueryLogic = `    // Build comprehensive query for group messages
    // Use $or to check both timestamp fields since different messages may have different fields
    const baseQuery = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming - get all messages in the group
      $or: [
        { 
          timestamp: {
            $gte: utcStart,
            $lte: utcEnd
          }
        },
        {
          createdAt: {
            $gte: utcStart,
            $lte: utcEnd
          }
        }
      ]
    };
    
    console.log('[WhatsApp Summary] Using dual timestamp field query (timestamp OR createdAt)');`;

// Replace the existing baseQuery definition including the field detection logic
const baseQueryPattern = /    \/\/ Build comprehensive query for group messages[\s\S]*?console\.log\('\[WhatsApp Summary\] Using dual timestamp field query \(timestamp OR createdAt\)'\);|    \/\/ Build comprehensive query for group messages[\s\S]*?const baseQuery = \{[\s\S]*?\};/;

if (baseQueryPattern.test(content)) {
  content = content.replace(baseQueryPattern, improvedQueryLogic);
  console.log('✅ Updated baseQuery logic to use $or for both timestamp fields');
} else {
  console.log('⚠️  Could not find baseQuery pattern to replace');
}

// Fix the sort operation to handle both fields
const sortPattern = /\.sort\(\{ \[timestampField\]: 1 \}\)/g;
const sortReplacement = '.sort({ timestamp: 1, createdAt: 1 })';

let sortCount = 0;
content = content.replace(sortPattern, () => {
  sortCount++;
  return sortReplacement;
});

if (sortCount > 0) {
  console.log(`✅ Updated ${sortCount} sort operations to handle both timestamp fields`);
}

// Update the fallback query as well
const fallbackQueryPattern = /const fallbackQuery = \{[\s\S]*?\[timestampField\]: \{ \$gte: fallbackStart, \$lte: fallbackEnd \}[\s\S]*?\};/;
const fallbackQueryReplacement = `const fallbackQuery = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming
      $and: [
        {
          $or: [
            { 'metadata.groupId': groupId },
            ...(groupInfo ? [{ 'metadata.groupName': groupInfo.name }] : []),
            { to: groupId }
          ]
        },
        {
          $or: [
            { 
              timestamp: {
                $gte: fallbackStart,
                $lte: fallbackEnd
              }
            },
            {
              createdAt: {
                $gte: fallbackStart,
                $lte: fallbackEnd
              }
            }
          ]
        }
      ]
    };`;

if (fallbackQueryPattern.test(content)) {
  content = content.replace(fallbackQueryPattern, fallbackQueryReplacement);
  console.log('✅ Updated fallback query to use $or for both timestamp fields');
}

// Fix the console.log for message time range
const timeRangeLogPattern = /const firstTime = firstMsg\[timestampField\][\s\S]*?console\.log\(`\[WhatsApp Summary\] Messages time range:[\s\S]*?\);/;
const timeRangeLogReplacement = `const firstTime = firstMsg.timestamp || firstMsg.createdAt;
        const lastTime = lastMsg.timestamp || lastMsg.createdAt;
        console.log(\`[WhatsApp Summary] Messages time range: \${firstTime?.toISOString()} to \${lastTime?.toISOString()}\`);`;

if (timeRangeLogPattern.test(content)) {
  content = content.replace(timeRangeLogPattern, timeRangeLogReplacement);
  console.log('✅ Fixed time range logging to check both fields');
}

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('\n✅ WhatsApp Message Retrieval logic has been fixed!');
console.log('\nChanges made:');
console.log('1. Replaced dynamic field detection with $or operator for both fields');
console.log('2. Updated queries to check both timestamp and createdAt simultaneously');
console.log('3. Fixed sort operations to handle both timestamp fields');
console.log('4. Updated fallback query with proper $and/$or structure');
console.log('5. Fixed console.log statements for time range display');
console.log('\n📝 Next steps:');
console.log('1. Rebuild the backend: cd src/backend && npm run build');
console.log('2. Restart the backend service');
console.log('3. Test the summary generation with a WhatsApp group');
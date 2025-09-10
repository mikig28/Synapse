#!/usr/bin/env node

/**
 * Fix WhatsApp Summary Query Issues
 * 
 * This script creates a more robust query logic that:
 * 1. Dynamically checks which timestamp field exists (timestamp vs createdAt)
 * 2. Removes the isIncoming filter to get all group messages
 * 3. Adds fallback queries to ensure messages are found
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Fixing WhatsApp Summary Controller Query Logic...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Create the improved query logic that checks both timestamp fields
const improvedQueryLogic = `    // Build comprehensive query for group messages
    // First, determine which timestamp field to use
    const timestampField = await WhatsAppMessage.findOne({ 'metadata.isGroup': true })
      .select('timestamp createdAt')
      .lean()
      .then(msg => {
        if (msg) {
          // Check which field has a valid date
          if (msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime())) {
            console.log('[WhatsApp Summary] Using "timestamp" field for queries');
            return 'timestamp';
          } else if (msg.createdAt instanceof Date && !isNaN(msg.createdAt.getTime())) {
            console.log('[WhatsApp Summary] Using "createdAt" field for queries');
            return 'createdAt';
          }
        }
        // Default to createdAt if no messages found or both fields invalid
        console.log('[WhatsApp Summary] Defaulting to "createdAt" field for queries');
        return 'createdAt';
      });

    const baseQuery = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming - get all messages in the group
      [timestampField]: {
        $gte: utcStart,
        $lte: utcEnd
      }
    };`;

// Replace the existing baseQuery definition
const baseQueryPattern = /    \/\/ Build comprehensive query for group messages[\s\S]*?const baseQuery = \{[\s\S]*?\};/;

if (baseQueryPattern.test(content)) {
  content = content.replace(baseQueryPattern, improvedQueryLogic);
  console.log('✅ Updated baseQuery logic to dynamically check timestamp fields');
} else {
  console.log('⚠️  Could not find baseQuery pattern to replace');
}

// Also update the sort field to use the dynamic timestamp field
const sortPattern = /\.sort\(\{ createdAt: 1 \}\)/g;
const sortReplacement = '.sort({ [timestampField]: 1 })';

let sortCount = 0;
content = content.replace(sortPattern, () => {
  sortCount++;
  return sortReplacement;
});

if (sortCount > 0) {
  console.log(`✅ Updated ${sortCount} sort operations to use dynamic timestamp field`);
}

// Update the fallback query as well
const fallbackQueryPattern = /const fallbackQuery = \{[\s\S]*?\};/;
const fallbackQueryReplacement = `const fallbackQuery = {
      'metadata.isGroup': true,
      // Don't filter by isIncoming
      $or: [
        { 'metadata.groupId': groupId },
        ...(groupInfo ? [{ 'metadata.groupName': groupInfo.name }] : []),
        { to: groupId }
      ],
      [timestampField]: { $gte: fallbackStart, $lte: fallbackEnd }
    };`;

if (fallbackQueryPattern.test(content)) {
  content = content.replace(fallbackQueryPattern, fallbackQueryReplacement);
  console.log('✅ Updated fallback query to use dynamic timestamp field');
}

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('\n✅ WhatsApp Summary Controller query logic has been fixed!');
console.log('\nChanges made:');
console.log('1. Added dynamic timestamp field detection (timestamp vs createdAt)');
console.log('2. Ensured isIncoming filter is not applied (gets all group messages)');
console.log('3. Updated sort operations to use the correct timestamp field');
console.log('4. Updated fallback query to use dynamic timestamp field');
console.log('\n📝 Next steps:');
console.log('1. Rebuild the backend: cd src/backend && npm run build');
console.log('2. Restart the backend service');
console.log('3. Test the summary generation with a WhatsApp group');
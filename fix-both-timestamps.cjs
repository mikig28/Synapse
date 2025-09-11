#!/usr/bin/env node

/**
 * Fix Both Timestamp Fields
 * 
 * This modifies the query to check both timestamp AND createdAt fields
 * using a safe approach that won't break the build
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Fixing WhatsApp queries to check both timestamp fields...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Replace the simple timestamp query with one that tries both fields
const oldQuerySection = `    // Try each query until we find messages
    for (let i = 0; i < queries.length && messages.length === 0; i++) {
      const query = queries[i];
      queryUsed = \`Query \${i + 1}\`;
      
      console.log(\`[WhatsApp Summary] \${queryUsed} for groupId \${groupId}:\`, JSON.stringify(query, null, 2));
      
      messages = await WhatsAppMessage.find(query)
        .populate('contactId')
        .sort({ timestamp: 1 })  // Sort by timestamp
        .lean();
        
      console.log(\`[WhatsApp Summary] \${queryUsed} returned \${messages.length} messages\`);`;

const newQuerySection = `    // Try each query until we find messages
    // We'll try both timestamp and createdAt fields
    for (let i = 0; i < queries.length && messages.length === 0; i++) {
      const query = queries[i];
      queryUsed = \`Query \${i + 1}\`;
      
      console.log(\`[WhatsApp Summary] \${queryUsed} for groupId \${groupId}:\`, JSON.stringify(query, null, 2));
      
      // First try with timestamp field
      messages = await WhatsAppMessage.find(query)
        .populate('contactId')
        .sort({ timestamp: 1 })
        .lean();
        
      console.log(\`[WhatsApp Summary] \${queryUsed} with timestamp returned \${messages.length} messages\`);
      
      // If no messages found, try with createdAt field
      if (messages.length === 0) {
        // Create a new query with createdAt instead of timestamp
        const createdAtQuery = JSON.parse(JSON.stringify(query));
        if (createdAtQuery.timestamp) {
          createdAtQuery.createdAt = createdAtQuery.timestamp;
          delete createdAtQuery.timestamp;
        }
        
        console.log(\`[WhatsApp Summary] Trying with createdAt field...\`);
        messages = await WhatsAppMessage.find(createdAtQuery)
          .populate('contactId')
          .sort({ createdAt: 1 })
          .lean();
          
        console.log(\`[WhatsApp Summary] \${queryUsed} with createdAt returned \${messages.length} messages\`);
      }`;

content = content.replace(oldQuerySection, newQuerySection);

// Also fix the fallback query to try both fields
const oldFallbackSection = `      messages = await WhatsAppMessage.find(fallbackQuery)
        .populate('contactId')
        .sort({ timestamp: 1 })  // Sort by timestamp
        .lean();
        
      console.log(\`[WhatsApp Summary] Fallback query returned \${messages.length} messages\`);`;

const newFallbackSection = `      messages = await WhatsAppMessage.find(fallbackQuery)
        .populate('contactId')
        .sort({ timestamp: 1 })
        .lean();
        
      console.log(\`[WhatsApp Summary] Fallback query with timestamp returned \${messages.length} messages\`);
      
      // If still no messages, try fallback with createdAt
      if (messages.length === 0) {
        const createdAtFallback = JSON.parse(JSON.stringify(fallbackQuery));
        if (createdAtFallback.timestamp) {
          createdAtFallback.createdAt = createdAtFallback.timestamp;
          delete createdAtFallback.timestamp;
        }
        
        console.log('[WhatsApp Summary] Trying fallback with createdAt field...');
        messages = await WhatsAppMessage.find(createdAtFallback)
          .populate('contactId')
          .sort({ createdAt: 1 })
          .lean();
          
        console.log(\`[WhatsApp Summary] Fallback query with createdAt returned \${messages.length} messages\`);
      }`;

content = content.replace(oldFallbackSection, newFallbackSection);

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('✅ Fixed to check both timestamp fields!');
console.log('\nChanges made:');
console.log('1. Query first tries with timestamp field');
console.log('2. If no messages found, automatically tries with createdAt field');
console.log('3. Same logic applied to fallback query');
console.log('4. No complex MongoDB operators used');
console.log('\n📝 This should find messages regardless of which timestamp field they use.');
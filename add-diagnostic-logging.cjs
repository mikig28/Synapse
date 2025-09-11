#!/usr/bin/env node

/**
 * Add Diagnostic Logging
 * 
 * This adds detailed logging to help understand why messages aren't found
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Adding diagnostic logging...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Add diagnostic check before building queries
const diagnosticCode = `
    // Diagnostic: Check what fields exist in the database
    const diagnosticSample = await WhatsAppMessage.findOne({ 'metadata.isGroup': true }).lean();
    if (diagnosticSample) {
      console.log('[WhatsApp Summary] Sample message structure:', {
        hasTimestamp: !!diagnosticSample.timestamp,
        hasCreatedAt: !!diagnosticSample.createdAt,
        timestampType: typeof diagnosticSample.timestamp,
        createdAtType: typeof diagnosticSample.createdAt,
        timestampValue: diagnosticSample.timestamp,
        createdAtValue: diagnosticSample.createdAt
      });
    } else {
      console.log('[WhatsApp Summary] WARNING: No group messages found in database!');
    }
`;

// Insert the diagnostic code before the baseQuery definition
const insertPoint = '    // Build comprehensive query for group messages';
content = content.replace(insertPoint, diagnosticCode + '\n' + insertPoint);

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('✅ Added diagnostic logging!');
console.log('\nThis will log:');
console.log('1. Sample message structure');
console.log('2. Which timestamp fields exist');
console.log('3. The data types of these fields');
console.log('4. Actual timestamp values');
console.log('\n📝 Check the backend logs after deployment to see what\'s happening.');
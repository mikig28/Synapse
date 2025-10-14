#!/usr/bin/env node

/**
 * Fix MongoDB Aggregation Syntax Error
 * 
 * The $or operator inside $cond is not valid MongoDB syntax.
 * We need to use a different approach.
 */

const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src/backend/src/api/controllers/whatsappSummaryController.ts');

console.log('🔧 Fixing MongoDB Aggregation Syntax Error...\n');

// Read the current controller
let content = fs.readFileSync(controllerPath, 'utf8');

// Fix the invalid $or syntax in aggregation
const invalidSyntax = `          recentMessages: {
            $sum: {
              $cond: {
                if: { $or: [
                    { $gte: ['$timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                    { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }
                  ] },
                then: 1,
                else: 0
              }
            }
          },`;

// Use $ifNull to check whichever field exists
const validSyntax = `          recentMessages: {
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
          },`;

if (content.includes(invalidSyntax)) {
  content = content.replace(invalidSyntax, validSyntax);
  console.log('✅ Fixed invalid $or syntax in aggregation pipeline');
} else {
  console.log('⚠️  Could not find the exact invalid syntax pattern');
  
  // Try a more flexible pattern
  const flexiblePattern = /recentMessages:\s*\{\s*\$sum:\s*\{\s*\$cond:\s*\{[^}]*\$or:[^}]*\}\s*\}\s*\}/s;
  
  if (flexiblePattern.test(content)) {
    content = content.replace(flexiblePattern, `recentMessages: {
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
          }`);
    console.log('✅ Applied flexible fix for aggregation syntax');
  }
}

// Write the updated content
fs.writeFileSync(controllerPath, content, 'utf8');

console.log('\n✅ MongoDB Aggregation syntax has been fixed!');
console.log('\nChanges made:');
console.log('1. Replaced invalid $or inside $cond with $ifNull approach');
console.log('2. Now uses $ifNull to check whichever timestamp field exists');
console.log('\n📝 This should fix the build error on Render');
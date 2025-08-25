const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/backend/src/api/controllers/wahaController.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing TypeScript null check error in wahaController.ts...');

// Fix: Add null check before checking if chatId is an object
const oldCheck = `      if (typeof chatId === 'object') {`;
const newCheck = `      if (chatId !== null && typeof chatId === 'object') {`;

if (content.includes(oldCheck)) {
  content = content.replace(oldCheck, newCheck);
  console.log('✅ Added null check to prevent TypeScript error');
} else {
  console.log('⚠️ Could not find the exact pattern to fix');
}

// Alternative fix: Look for the lines with the error
const lines = content.split('\n');
let modified = false;

// Fix line 448: if ('id' in chatId)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("if ('id' in chatId)") && !lines[i].includes('chatId !== null')) {
    lines[i] = lines[i].replace("if ('id' in chatId)", "if (chatId !== null && 'id' in chatId)");
    console.log('✅ Fixed line with "id" check');
    modified = true;
  }
  
  if (lines[i].includes("else if ('_id' in chatId)") && !lines[i].includes('chatId !== null')) {
    lines[i] = lines[i].replace("else if ('_id' in chatId)", "else if (chatId !== null && '_id' in chatId)");
    console.log('✅ Fixed line with "_id" check');
    modified = true;
  }
}

if (modified) {
  content = lines.join('\n');
}

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('\n✅ TypeScript null check errors fixed!');
console.log('The build should now complete successfully.');
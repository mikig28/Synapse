const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/backend/src/api/controllers/wahaController.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Applying final TypeScript fix for wahaController.ts...');

// Find and replace the problematic section with a cleaner version
const oldSection = `    // Validate and sanitize chatId to prevent [object Object] errors
    if (chatId) {
      // Check if chatId is an object (shouldn't happen but defensive coding)
      // Note: typeof null === 'object' in JavaScript, so we need to check for null explicitly
      if (chatId !== null && typeof chatId === 'object') {
        console.error('[WAHA Controller] ❌ chatId is an object:', chatId);
        if ('id' in chatId) {
          chatId = (chatId as any).id;
        } else if ('_id' in chatId) {
          chatId = (chatId as any)._id;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid chatId format',
            details: { receivedType: typeof chatId }
          });
        }
      }
      
      // Convert to string if needed
      chatId = String(chatId);
      // TypeScript type guard - chatId is definitely a string now
      
      // Check for literal "[object Object]" string
      if (chatId === '[object Object]' || chatId.includes('[object')) {
        console.error('[WAHA Controller] ❌ Invalid chatId "[object Object]" detected');
        return res.status(400).json({
          success: false,
          error: 'Invalid chatId received',
          details: { chatId, hint: 'Frontend sent an object instead of string' }
        });
      }
    }`;

const newSection = `    // Validate and sanitize chatId to prevent [object Object] errors
    if (chatId) {
      // Check if chatId is an object (shouldn't happen but defensive coding)
      // Note: typeof null === 'object' in JavaScript, so we need to check for null explicitly
      if (chatId !== null && typeof chatId === 'object') {
        console.error('[WAHA Controller] ❌ chatId is an object:', chatId);
        // Type assertion to tell TypeScript chatId is not null here
        const chatIdObj = chatId as any;
        if ('id' in chatIdObj) {
          chatId = chatIdObj.id;
        } else if ('_id' in chatIdObj) {
          chatId = chatIdObj._id;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid chatId format',
            details: { receivedType: typeof chatId }
          });
        }
      }
      
      // Convert to string if needed
      chatId = String(chatId);
      // TypeScript type guard - chatId is definitely a string now
      
      // Check for literal "[object Object]" string
      if (chatId === '[object Object]' || chatId.includes('[object')) {
        console.error('[WAHA Controller] ❌ Invalid chatId "[object Object]" detected');
        return res.status(400).json({
          success: false,
          error: 'Invalid chatId received',
          details: { chatId, hint: 'Frontend sent an object instead of string' }
        });
      }
    }`;

// Try to replace the section
if (content.includes('// Validate and sanitize chatId to prevent [object Object] errors')) {
  // Find the start and end of the validation block
  const startIndex = content.indexOf('// Validate and sanitize chatId to prevent [object Object] errors');
  const endPattern = '    }';
  
  // Find the matching closing brace
  let braceCount = 0;
  let endIndex = startIndex;
  let inBlock = false;
  
  for (let i = startIndex; i < content.length; i++) {
    if (content.substring(i, i + 8) === '    if (') {
      inBlock = true;
    }
    if (inBlock) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0 && content.substring(i - 4, i + 1) === '    }') {
          endIndex = i + 1;
          break;
        }
      }
    }
  }
  
  if (endIndex > startIndex) {
    const before = content.substring(0, startIndex - 4); // Include indentation
    const after = content.substring(endIndex);
    content = before + newSection + after;
    console.log('✅ Replaced validation section with improved version');
  }
} else {
  console.log('⚠️ Could not find validation section, trying alternative approach...');
  
  // Alternative: Just fix the specific lines
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("if ('id' in chatId)")) {
      lines[i] = "        const chatIdObj = chatId as any;\n        if ('id' in chatIdObj) {";
      lines[i + 1] = lines[i + 1].replace('chatId', 'chatIdObj');
      console.log('✅ Fixed "id" check line');
    }
    if (lines[i].includes("else if ('_id' in chatId)")) {
      lines[i] = "        } else if ('_id' in chatIdObj) {";
      lines[i + 1] = lines[i + 1].replace('chatId', 'chatIdObj');
      console.log('✅ Fixed "_id" check line');
    }
  }
  content = lines.join('\n');
}

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('\n✅ Final TypeScript fix applied!');
console.log('The build should now complete successfully.');
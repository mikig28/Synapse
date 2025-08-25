const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// The issue is around the selectedChat conditional
// The structure should be:
// Inside GlassCard, check if selectedChat exists
// If yes, show the chat interface (messages + input)
// If no, show "Select a chat" message

// Find the GlassCard that contains the chat interface
// Look for the pattern around line 2065-2130

const lines = content.split('\n');
let newLines = [];
let inChatArea = false;
let needsSelectedChatCheck = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Check if we're entering the chat display area (after the Load History button)
  if (i >= 2063 && i <= 2065) {
    // Right after the Load History button, before the messages area
    if (trimmed.startsWith('<div className="flex-1 overflow-y-auto')) {
      // This is where we need to add the selectedChat check
      newLines.push('');
      newLines.push('            {selectedChat ? (');
      newLines.push('              <>');
      newLines.push(line);
      inChatArea = true;
      continue;
    }
  }
  
  // Handle the fragment closing and else branch
  if (i === 2128 && trimmed === '</div>') {
    // This is the end of the input area
    newLines.push(line);
    newLines.push('              </>');
    continue;
  }
  
  if (i === 2129 && trimmed === '</>') {
    // Skip this orphaned fragment
    continue;
  }
  
  if (i === 2130 && trimmed === ') : (') {
    // Keep this as part of the conditional
    newLines.push('            ) : (');
    continue;
  }
  
  if (i === 2137 && trimmed === ')}') {
    // Change this to properly close the conditional
    newLines.push('            )}');
    continue;
  }
  
  newLines.push(line);
}

content = newLines.join('\n');

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed selectedChat conditional structure');
console.log('The chat interface now properly checks if a chat is selected.');
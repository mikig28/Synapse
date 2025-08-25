const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// The main issue is that after the send button, there's a malformed conditional structure
// The pattern should be:
// After the send button and input area, we should check if selectedChat exists
// If it does, show the chat interface; if not, show "select a chat" message

// Fix the specific area after the send button (around lines 2126-2140)
// The current structure has duplicated conditionals and mismatched tags

// Replace the problematic section
content = content.replace(
  /(\s+<\/Button>\s+<\/div>\s*)\n+\s*\{\s*selectedChat\s*\?\s*\(\s*<div[^>]*>\s*<div[^>]*>\s*<div[^>]*>\s*<MessageCircle[^>]*\/>\s*<p[^>]*>Select a chat[^<]*<\/p>\s*<\/div>\s*<\/div>\s*\)\s*:\s*\(\s*\)\s*\}\s*<\/GlassCard>/gms,
  `$1
              {!selectedChat ? (
                <div className="flex-1 flex items-center justify-center mt-8">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-blue-300/50 mx-auto mb-4" />
                    <p className="text-blue-200/70">Select a chat to start messaging</p>
                  </div>
                </div>
              ) : null}
            </GlassCard>`
);

// Also fix any remaining conditional issues
// Remove duplicate selectedChat conditionals
content = content.replace(
  /\s+\{\s*selectedChat\s*\?\s*\(\s*<div className="flex flex-col h-full">\s*<div className="flex-1 flex items-center justify-center">\s*<div className="text-center">\s*<MessageCircle[^}]+\}\s*<\/GlassCard>/gms,
  `
            </GlassCard>`
);

// Ensure proper structure: the main conditional should be around the entire chat interface
// Let's find the section that contains the chat interface and fix it properly

// Split into lines for analysis
const lines = content.split('\n');
let inChatSection = false;
let braceCount = 0;
let fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Skip empty fragment tags
  if (trimmed === '<>' || trimmed === '</>') {
    continue;
  }
  
  // Track if we're in the chat display section
  if (trimmed.includes('displayedMessages.length === 0')) {
    inChatSection = true;
  }
  
  // Fix duplicate selectedChat conditionals
  if (inChatSection && trimmed.startsWith('{selectedChat ?')) {
    // Skip this duplicate conditional
    if (i < lines.length - 5) {
      const nextFewLines = lines.slice(i + 1, i + 6).join(' ');
      if (nextFewLines.includes('Select a chat to start messaging')) {
        // Skip this entire block until we find the closing
        let skipCount = 0;
        let tempBraceCount = 1;
        for (let j = i + 1; j < lines.length && tempBraceCount > 0; j++) {
          if (lines[j].includes('{')) tempBraceCount++;
          if (lines[j].includes('}')) tempBraceCount--;
          skipCount++;
        }
        i += skipCount;
        continue;
      }
    }
  }
  
  // Fix the ) : ( pattern after buttons
  if (trimmed === ') : (') {
    // This shouldn't exist in isolation
    continue;
  }
  
  fixedLines.push(line);
  
  if (trimmed.includes('</GlassCard>') && inChatSection) {
    inChatSection = false;
  }
}

content = fixedLines.join('\n');

// Clean up any multiple empty lines
content = content.replace(/\n\n\n+/g, '\n\n');

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed conditional structure in WhatsAppPage.tsx');
console.log('The selectedChat conditional has been properly structured.');
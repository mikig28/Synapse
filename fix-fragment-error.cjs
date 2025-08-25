const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// The issue is the fragment <> at line 2128 which should be removed
// This is inside a selectedChat conditional that should render the chat interface
// when selectedChat exists, or show "Select a chat" message when it doesn't

// Remove the incorrect fragment closing tag
content = content.replace(
  /(\s+<\/div>\s+)<>\s+\) : \(/gm,
  '$1\n              {selectedChat ? (\n                <>'
);

// Also need to ensure the structure is correct
// The pattern should be: {selectedChat ? ( chat UI ) : ( no chat message )}
// Let's find and fix the specific area around line 2128

// Split into lines for precise editing
const lines = content.split('\n');

// Find the line with the problematic fragment
for (let i = 0; i < lines.length; i++) {
  // Remove standalone <> or </> fragments that appear incorrectly
  if (lines[i].trim() === '<>') {
    // Check context - if it's after a closing tag and before ) : (
    if (i > 0 && i < lines.length - 1) {
      const prevLine = lines[i - 1].trim();
      const nextLine = lines[i + 1].trim();
      if (prevLine.endsWith('</div>') && nextLine === ') : (') {
        // Remove this incorrect fragment
        lines[i] = '';
      }
    }
  }
  
  // Fix the specific pattern at line 2128
  if (lines[i].trim() === '</>' && i > 0) {
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
    if (nextLine === ') : (') {
      // This is the problematic fragment closing - remove it
      lines[i] = '';
    }
  }
}

// Join back and clean up empty lines
content = lines.join('\n').replace(/\n\n\n+/g, '\n\n');

// Now we need to ensure the selectedChat conditional is properly structured
// The structure should be: 
// GlassCard > {selectedChat ? ( ...chat interface... ) : ( ...no selection message... )}

// Look for the pattern and ensure proper structure
content = content.replace(
  /(\s+<\/Button>\s+<\/div>\s+)\s*\) : \(/gm,
  `$1
              {selectedChat ? (
                <div className="flex flex-col h-full">`
);

// Ensure the conditional render is properly closed
// After the input/button section, before the "no chat selected" message
content = content.replace(
  /(\s+<\/Button>\s+<\/div>\s+)<>/gm,
  `$1
                </div>`
);

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed fragment error in WhatsAppPage.tsx');
console.log('The selectedChat conditional rendering structure has been corrected.');
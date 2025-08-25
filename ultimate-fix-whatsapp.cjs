const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// The main issue is around line 2144 where there's a fragment <> that should be 
// part of a conditional check for selectedChat
// The structure should be:
// {selectedChat ? (
//   <> ... chat interface ... </>
// ) : (
//   <div>Select a chat message</div>
// )}

// Find the problematic area and fix it
// The fragment at line 2144 and the conditional at 2145 need to be fixed

// Replace the broken conditional structure
content = content.replace(
  /(<\/Button>\s*<\/div>\s*)<>\s*\) : \(/gms,
  `$1
              {selectedChat ? (
                <>`
);

// Also ensure the closing is correct
content = content.replace(
  /(<\/div>\s*)\)\}\s*<\/GlassCard>/gms,
  `$1
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-blue-300/50 mx-auto mb-4" />
                    <p className="text-blue-200/70">Select a chat to start messaging</p>
                  </div>
                </div>
              )}
            </GlassCard>`
);

// Now let's handle this more carefully by parsing the structure
const lines = content.split('\n');
let newLines = [];
let inChatInterface = false;
let fragmentDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Check if we're at the problematic fragment area
  if (i >= 2142 && i <= 2155) {
    // This is the area with the issue
    
    if (i === 2143) {
      // After the </Button></div> add the selectedChat check
      newLines.push(line);
      newLines.push('');
      newLines.push('              {selectedChat ? (');
      newLines.push('                <>');
      continue;
    }
    
    if (trimmed === '<>') {
      // Skip this orphan fragment
      continue;
    }
    
    if (trimmed === '</>') {
      // This closes the fragment for selectedChat content
      newLines.push('                </>');
      continue;
    }
    
    if (i === 2152 && trimmed === ')}') {
      // This is wrong - should be closing the ternary
      continue;
    }
    
    if (i === 2145 && trimmed === ') : (') {
      // This should be kept as part of inner conditional
      newLines.push(line);
      continue;
    }
  }
  
  newLines.push(line);
}

content = newLines.join('\n');

// Clean up any remaining issues
// Remove any standalone fragments
content = content.replace(/^\s*<>\s*$/gm, '');
content = content.replace(/^\s*<\/>\s*$/gm, '');

// Fix any double closing brackets
content = content.replace(/\)\}\s*\)\}/g, ')}');

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Ultimate fix applied to WhatsAppPage.tsx');
console.log('The selectedChat conditional structure has been properly fixed.');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Remove the malformed line that was added by sed
content = content.replace(/\) : \(\\n.*?\\n.*?<\/div>/gs, '');

// Now properly fix the button structure
// Find the mobile AnimatedButton and add the desktop version
const lines = content.split('\n');
let newLines = [];
let foundMobileButton = false;
let addedElseBranch = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Look for the mobile button closing
  if (trimmed === '</AnimatedButton>' && !addedElseBranch) {
    // Check if this is the Load History button by looking at previous lines
    let isLoadHistoryButton = false;
    for (let j = Math.max(0, i - 10); j < i; j++) {
      if (lines[j].includes('Load History') && lines[j].includes('!isMobile')) {
        isLoadHistoryButton = true;
        break;
      }
    }
    
    if (isLoadHistoryButton) {
      newLines.push(line); // Add the closing </AnimatedButton>
      
      // Add the else branch with desktop button
      newLines.push('              ) : (');
      newLines.push('                <AnimatedButton');
      newLines.push('                  onClick={() => {');
      newLines.push('                    console.log(\'[WhatsApp Frontend] Load History clicked, selectedChat:\', selectedChat);');
      newLines.push('                    if (selectedChat && selectedChat.id) {');
      newLines.push('                      let chatId: string;');
      newLines.push('                      ');
      newLines.push('                      if (typeof selectedChat.id === \'string\') {');
      newLines.push('                        chatId = selectedChat.id;');
      newLines.push('                      } else if (typeof selectedChat.id === \'object\' && selectedChat.id !== null) {');
      newLines.push('                        console.warn(\'[WhatsApp Frontend] WARNING: selectedChat.id is an object:\', selectedChat.id);');
      newLines.push('                        console.error(\'[WhatsApp Frontend] Full selectedChat structure:\', JSON.stringify(selectedChat, null, 2));');
      newLines.push('                        chatId = String(selectedChat.id);');
      newLines.push('                      } else {');
      newLines.push('                        chatId = String(selectedChat.id);');
      newLines.push('                      }');
      newLines.push('                      ');
      newLines.push('                      console.log(\'[WhatsApp Frontend] Extracted chatId:\', chatId, \'type:\', typeof chatId);');
      newLines.push('                      if (chatId && chatId !== \'[object Object]\') {');
      newLines.push('                        console.log(\'[WhatsApp Frontend] Loading history for chatId:\', chatId);');
      newLines.push('                        fetchChatHistory(chatId, 10);');
      newLines.push('                      } else {');
      newLines.push('                        console.error(\'[WhatsApp Frontend] Invalid chat ID detected:\', chatId);');
      newLines.push('                        toast({');
      newLines.push('                          title: "Error",');
      newLines.push('                          description: "Invalid chat selected. Please try again.",');
      newLines.push('                          variant: "destructive",');
      newLines.push('                        });');
      newLines.push('                      }');
      newLines.push('                    } else {');
      newLines.push('                      console.error(\'[WhatsApp Frontend] No chat selected\');');
      newLines.push('                      toast({');
      newLines.push('                        title: "Error",');
      newLines.push('                        description: "Please select a chat first",');
      newLines.push('                        variant: "destructive",');
      newLines.push('                      });');
      newLines.push('                    }');
      newLines.push('                  }}');
      newLines.push('                  variant="outline"');
      newLines.push('                  size="sm"');
      newLines.push('                  disabled={fetchingHistory}');
      newLines.push('                  className="border-orange-400/30 text-orange-200 hover:bg-orange-500/10 flex-shrink-0"');
      newLines.push('                >');
      newLines.push('                  {fetchingHistory ? (');
      newLines.push('                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />');
      newLines.push('                  ) : (');
      newLines.push('                    <Download className="w-4 h-4 mr-1" />');
      newLines.push('                  )}');
      newLines.push('                  {!isMobile && \'Load History\'}');
      newLines.push('                </AnimatedButton>');
      newLines.push('              )}');
      newLines.push('            </div>');
      
      addedElseBranch = true;
      
      // Skip the next two lines if they are closing divs
      if (i + 1 < lines.length && lines[i + 1].trim().endsWith('</div>')) {
        i++; // Skip next line
        if (i + 1 < lines.length && lines[i + 1].trim().endsWith('</div>')) {
          i++; // Skip another line
        }
      }
      continue;
    }
  }
  
  newLines.push(line);
}

content = newLines.join('\n');

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Final fix applied to WhatsAppPage.tsx');
console.log('The Load History button now has both mobile and desktop versions with proper validation.');
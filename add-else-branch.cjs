const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Find the closing of the mobile AnimatedButton and add the else branch
const lines = content.split('\n');
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Look for the specific closing pattern
  if (i === 2009 && line.trim() === '</AnimatedButton>') {
    newLines.push(line);
    // Add the else branch with desktop button
    newLines.push('              ) : (');
    newLines.push('                <AnimatedButton');
    newLines.push('                  onClick={() => {');
    newLines.push('                    console.log(\'[WhatsApp Frontend] Desktop Load History clicked, selectedChat:\', selectedChat);');
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
    newLines.push('                      ');
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
    newLines.push('                      console.error(\'[WhatsApp Frontend] No chat selected or missing ID\');');
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
  } else {
    newLines.push(line);
  }
}

content = newLines.join('\n');

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Added else branch with desktop Load History button');
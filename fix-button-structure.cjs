const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// The issue is that the isMobile ternary for the Load History button is incomplete
// It has the true branch but no false branch
// We need to add the else branch with the desktop version of the button

// Find and fix the Load History button structure
// The pattern is: {isMobile ? ( ...mobile button... ) but missing the : ( ...desktop button... )}

// Replace the broken structure with the complete ternary
content = content.replace(
  /(\{isMobile \? \([^}]*?Load History[^}]*?<\/AnimatedButton>\s*)\s*<\/div>\s*<\/div>/gms,
  `$1
              ) : (
                <AnimatedButton
                  onClick={() => {
                    console.log('[WhatsApp Frontend] Load History clicked, selectedChat:', selectedChat);
                    if (selectedChat && selectedChat.id) {
                      let chatId: string;
                      
                      if (typeof selectedChat.id === 'string') {
                        chatId = selectedChat.id;
                      } else if (typeof selectedChat.id === 'object' && selectedChat.id !== null) {
                        console.warn('[WhatsApp Frontend] WARNING: selectedChat.id is an object:', selectedChat.id);
                        console.error('[WhatsApp Frontend] Full selectedChat structure:', JSON.stringify(selectedChat, null, 2));
                        if ('_serialized' in (selectedChat.id as any)) {
                          chatId = (selectedChat.id as any)._serialized;
                        } else if ('user' in (selectedChat.id as any)) {
                          chatId = (selectedChat.id as any).user;
                        } else {
                          chatId = String(selectedChat.id);
                        }
                      } else {
                        chatId = String(selectedChat.id);
                      }
                      
                      console.log('[WhatsApp Frontend] Extracted chatId:', chatId, 'type:', typeof chatId);
                      if (chatId && chatId !== '[object Object]') {
                        console.log('[WhatsApp Frontend] Loading history for chatId:', chatId);
                        fetchChatHistory(chatId, 10);
                      } else {
                        console.error('[WhatsApp Frontend] Invalid chat ID detected:', chatId);
                        toast({
                          title: "Error",
                          description: "Invalid chat selected. Please try again.",
                          variant: "destructive",
                        });
                      }
                    } else {
                      console.error('[WhatsApp Frontend] No chat selected');
                      toast({
                        title: "Error",
                        description: "Please select a chat first",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={fetchingHistory}
                  className="border-orange-400/30 text-orange-200 hover:bg-orange-500/10 flex-shrink-0"
                >
                  {fetchingHistory ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  {!isMobile && 'Load History'}
                </AnimatedButton>
              )}
            </div>`
);

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed button structure in WhatsAppPage.tsx');
console.log('The isMobile ternary for Load History button now has both mobile and desktop versions.');
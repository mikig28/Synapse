const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// The issue is around line 1922-2012 where there's a malformed ternary expression
// The isMobile ? ( starts at line 1922 but doesn't have a proper else branch
// and there are extra closing divs at lines 2011-2012

// Find and fix the malformed ternary expression
// The pattern is: {isMobile ? ( ... </AnimatedButton> </div> </div>
// This should be: {isMobile ? ( ... </AnimatedButton> ) : ( ... )}

// First, let's fix the specific issue at lines 2010-2012
// Remove the extra closing divs after </AnimatedButton>
content = content.replace(
  /<\/AnimatedButton>\s*<\/div>\s*<\/div>\s*<div className="flex-1 overflow-y-auto/g,
  `</AnimatedButton>
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
                        chatId = String(selectedChat.id);
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
            </div>
            
            <div className="flex-1 overflow-y-auto`
);

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed syntax error in WhatsAppPage.tsx');
console.log('The ternary expression for isMobile has been properly closed with an else branch.');
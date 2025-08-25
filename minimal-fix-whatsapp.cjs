const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add validation to fetchChatHistory function
content = content.replace(
  /(const fetchChatHistory = async \(chatId: string, limit: number = 50\) => \{)/,
  `$1
    // Validate chatId to prevent [object Object] errors
    if (!chatId || typeof chatId !== 'string') {
      console.error('[WhatsApp Frontend] Invalid chatId provided to fetchChatHistory:', chatId);
      return;
    }
    
    if (chatId === '[object Object]' || chatId.includes('[object')) {
      console.error('[WhatsApp Frontend] Detected [object Object] in chatId, aborting fetch');
      toast({
        title: "Error",
        description: "Invalid chat selected. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('[WhatsApp Frontend] fetchChatHistory called with chatId:', chatId, 'type:', typeof chatId);`
);

// Fix 2: Update the onClick handler for Load History button to validate chatId
// Find the pattern: onClick={() => fetchChatHistory(selectedChat.id, 10)}
content = content.replace(
  /onClick=\{\(\) => fetchChatHistory\(selectedChat\.id, 10\)\}/g,
  `onClick={() => {
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
                      console.error('[WhatsApp Frontend] No chat selected or missing ID');
                      toast({
                        title: "Error",
                        description: "Please select a chat first",
                        variant: "destructive",
                      });
                    }
                  }}`
);

// Fix 3: Ensure group IDs are strings when processing
// Find the groups.map pattern
content = content.replace(
  /(const processedGroups = groups\.map\(group => \(\{)/,
  `$1
      ...group,
      id: typeof group.id === 'string' ? group.id : String(group.id),
      // Override the id to ensure it's always a string`
);

// Remove the original ...group line if it exists after our addition
content = content.replace(
  /id: typeof group\.id === 'string' \? group\.id : String\(group\.id\),\s*\/\/ Override[^\n]*\n\s*\.\.\.group,/,
  `id: typeof group.id === 'string' ? group.id : String(group.id), // Override the id to ensure it's always a string`
);

// Fix 4: Add validation in handleChatSelection
content = content.replace(
  /(const handleChatSelection = \(chat: Chat\) => \{)/,
  `$1
    // Validate and ensure chat ID is a string
    if (chat && chat.id && typeof chat.id !== 'string') {
      console.warn('[WhatsApp Frontend] Converting chat.id to string in handleChatSelection:', chat.id);
      chat = { ...chat, id: String(chat.id) };
    }
    
    console.log('[WhatsApp Frontend] handleChatSelection called with chat:', chat?.name, 'id:', chat?.id, 'type:', typeof chat?.id);`
);

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Minimal essential fixes applied to WhatsAppPage.tsx');
console.log('- Added validation to fetchChatHistory');
console.log('- Fixed Load History button click handler');
console.log('- Ensured group IDs are strings');
console.log('- Added validation to handleChatSelection');
console.log('');
console.log('These fixes prevent [object Object] from being sent as chatId.');
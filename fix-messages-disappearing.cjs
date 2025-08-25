const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing message disappearing issue in WhatsAppPage.tsx...');

// Fix 1: Update fetchMessages to properly merge messages instead of replacing them
const oldFetchMessages = `          setMessages(processedMessages);
          
          // Cache messages for this chat
          if (chatId) {
            setMessagesCache(prev => ({
              ...prev,
              [chatId]: processedMessages
            }));
          }`;

const newFetchMessages = `          // If fetching for a specific chat, update cache and merge messages
          if (chatId) {
            setMessagesCache(prev => ({
              ...prev,
              [chatId]: processedMessages
            }));
            
            // Merge messages - keep messages from other chats
            setMessages(prevMessages => {
              // Remove old messages for this chat
              const otherMessages = prevMessages.filter(msg => msg.chatId !== chatId);
              // Add new messages for this chat
              return [...otherMessages, ...processedMessages];
            });
          } else {
            // If no specific chat, these are recent messages from all chats
            setMessages(processedMessages);
          }`;

// Fix 2: Update the legacy endpoint section similarly
const oldLegacyMessages = `        setMessages(processedMessages);
        
        // Cache messages for this chat
        if (chatId) {
          setMessagesCache(prev => ({
            ...prev,
            [chatId]: processedMessages
          }));
        }`;

const newLegacyMessages = `        // If fetching for a specific chat, update cache and merge messages
        if (chatId) {
          setMessagesCache(prev => ({
            ...prev,
            [chatId]: processedMessages
          }));
          
          // Merge messages - keep messages from other chats
          setMessages(prevMessages => {
            // Remove old messages for this chat
            const otherMessages = prevMessages.filter(msg => msg.chatId !== chatId);
            // Add new messages for this chat
            return [...otherMessages, ...processedMessages];
          });
        } else {
          // If no specific chat, these are recent messages from all chats
          setMessages(processedMessages);
        }`;

// Apply fixes
let fixCount = 0;

// Try to replace the WAHA section
if (content.includes(oldFetchMessages)) {
  content = content.replace(oldFetchMessages, newFetchMessages);
  fixCount++;
  console.log('✅ Fixed WAHA message handling');
} else {
  console.log('⚠️ Could not find exact WAHA message handling pattern');
}

// Try to replace the legacy section
if (content.includes(oldLegacyMessages)) {
  content = content.replace(oldLegacyMessages, newLegacyMessages);
  fixCount++;
  console.log('✅ Fixed legacy message handling');
} else {
  console.log('⚠️ Could not find exact legacy message handling pattern');
}

// Fix 3: Ensure chatId is properly set in processed messages
const oldProcessing = `            chatId: msg.chatId || chatId || '',`;
const newProcessing = `            chatId: msg.chatId || chatId || msg.from || '',`;

if (content.includes(oldProcessing)) {
  content = content.replaceAll(oldProcessing, newProcessing);
  fixCount++;
  console.log('✅ Fixed chatId assignment in message processing');
}

// Fix 4: Improve displayedMessages filter to handle edge cases
const oldFilter = `    // Filter messages for the selected chat with type safety
    const chatMessages = messages.filter(msg => {
      // Ensure both msg.chatId and selectedChat.id are strings before any operations
      if (!msg.chatId || !selectedChat.id || 
          typeof msg.chatId !== 'string' || 
          typeof selectedChat.id !== 'string') {
        return false;
      }
      
      // Check various possible chat ID formats with safe string operations
      return msg.chatId === selectedChat.id || 
             msg.chatId === selectedChat.id.split('@')[0] ||
             msg.from === selectedChat.id ||
             (typeof msg.from === 'string' && msg.from === selectedChat.id.split('@')[0]);
    });`;

const newFilter = `    // Filter messages for the selected chat with type safety
    const chatMessages = messages.filter(msg => {
      // Ensure we have valid IDs to compare
      if (!selectedChat.id) return false;
      
      const msgChatId = String(msg.chatId || msg.from || '');
      const selectedChatId = String(selectedChat.id);
      
      if (!msgChatId) return false;
      
      // Check various possible chat ID formats
      // Handle both full IDs (with @c.us or @g.us) and partial IDs
      const msgIdBase = msgChatId.split('@')[0];
      const selectedIdBase = selectedChatId.split('@')[0];
      
      return msgChatId === selectedChatId || 
             msgIdBase === selectedIdBase ||
             msgChatId === selectedIdBase ||
             msgIdBase === selectedChatId ||
             (msg.from && String(msg.from) === selectedChatId) ||
             (msg.from && String(msg.from).split('@')[0] === selectedIdBase);
    });`;

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  fixCount++;
  console.log('✅ Fixed message filtering logic');
} else {
  console.log('⚠️ Could not find exact filter pattern, trying alternative...');
  
  // Try a simpler replacement
  const simpleOldFilter = `      return msg.chatId === selectedChat.id || 
             msg.chatId === selectedChat.id.split('@')[0] ||
             msg.from === selectedChat.id ||
             (typeof msg.from === 'string' && msg.from === selectedChat.id.split('@')[0]);`;
             
  const simpleNewFilter = `      // More robust chat ID matching
      const msgChatId = String(msg.chatId || msg.from || '');
      const selectedChatId = String(selectedChat.id);
      const msgIdBase = msgChatId.split('@')[0];
      const selectedIdBase = selectedChatId.split('@')[0];
      
      return msgChatId === selectedChatId || 
             msgIdBase === selectedIdBase ||
             msgChatId === selectedIdBase ||
             msgIdBase === selectedChatId ||
             (msg.from && String(msg.from) === selectedChatId) ||
             (msg.from && String(msg.from).split('@')[0] === selectedIdBase);`;
  
  if (content.includes(simpleOldFilter)) {
    content = content.replace(simpleOldFilter, simpleNewFilter);
    fixCount++;
    console.log('✅ Fixed message filtering logic (alternative method)');
  }
}

if (fixCount > 0) {
  fs.writeFileSync(filePath, content);
  console.log(`\n✅ Successfully applied ${fixCount} fixes to WhatsAppPage.tsx`);
  console.log('Messages should now persist correctly when switching chats.');
} else {
  console.log('\n⚠️ No fixes were applied. The code might already be fixed or has a different structure.');
}

console.log('\nPlease restart the frontend for changes to take effect.');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add validation to fetchChatHistory to prevent [object Object]
content = content.replace(
  /(const fetchChatHistory = async \(chatId: string[^}]*?\) => \{)/,
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
    }`
);

// Fix 2: Add validation to the Load History button onClick handler
// Find the button click handler and add validation
content = content.replace(
  /(onClick=\{[^}]*fetchChatHistory\(selectedChat\.id[^}]*\})/g,
  `onClick={() => {
    console.log('[WhatsApp Frontend] Load History clicked, selectedChat:', selectedChat);
    if (selectedChat && selectedChat.id) {
      // Ensure chatId is a string
      let chatId: string;
      
      if (typeof selectedChat.id === 'string') {
        chatId = selectedChat.id;
      } else if (typeof selectedChat.id === 'object' && selectedChat.id !== null) {
        console.warn('[WhatsApp Frontend] WARNING: selectedChat.id is an object:', selectedChat.id);
        console.error('[WhatsApp Frontend] Full selectedChat structure:', JSON.stringify(selectedChat, null, 2));
        // Try to extract a meaningful ID
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
  }}`
);

// Fix 3: Ensure groups have string IDs when processing
content = content.replace(
  /(const processedGroups = groups\.map\(group => \({[\s\S]*?id: group\.id[^,]*,)/g,
  `const processedGroups = groups.map(group => ({
      ...group,
      id: typeof group.id === 'string' ? group.id : String(group.id),`
);

// Fix 4: Add validation in handleChatSelection
content = content.replace(
  /(const handleChatSelection = \(chat: [^)]+\) => \{)/,
  `$1
    // Validate chat ID is a string
    if (chat && chat.id && typeof chat.id !== 'string') {
      console.warn('[WhatsApp Frontend] Converting chat.id to string:', chat.id);
      chat = { ...chat, id: String(chat.id) };
    }`
);

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Comprehensive fix applied to WhatsAppPage.tsx');
console.log('- Added validation to fetchChatHistory');
console.log('- Fixed Load History button click handler');
console.log('- Ensured group IDs are strings');
console.log('- Added validation to handleChatSelection');
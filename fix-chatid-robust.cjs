const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Applying robust fix for chat ID issue...');

// Fix 1: Add validation directly in fetchChatHistory function
const oldFetchChatHistory = `  const fetchChatHistory = async (chatId: string, limit: number = 10) => {
    try {
      setFetchingHistory(true);
      
      // Prefer WAHA modern endpoint; fallback to legacy
      let response: any;`;

const newFetchChatHistory = `  const fetchChatHistory = async (chatId: string, limit: number = 10) => {
    try {
      setFetchingHistory(true);
      
      // Critical validation - prevent [object Object]
      console.log('[WhatsApp Frontend] fetchChatHistory called with:', { 
        chatId, 
        chatIdType: typeof chatId,
        chatIdValue: chatId,
        isObjectString: chatId === '[object Object]'
      });
      
      if (!chatId || typeof chatId !== 'string' || chatId === '[object Object]' || chatId.includes('[object')) {
        console.error('[WhatsApp Frontend] ❌ Invalid chatId in fetchChatHistory:', chatId);
        toast({
          title: "Error",
          description: "Invalid chat ID. Please select the chat again.",
          variant: "destructive",
        });
        setFetchingHistory(false);
        return;
      }
      
      // Prefer WAHA modern endpoint; fallback to legacy
      let response: any;`;

// Apply Fix 1
if (content.includes('const fetchChatHistory = async (chatId: string, limit: number = 10) => {')) {
  content = content.replace(oldFetchChatHistory, newFetchChatHistory);
  console.log('✅ Added robust validation to fetchChatHistory');
} else {
  console.log('⚠️ Could not find fetchChatHistory to update');
}

// Fix 2: Update the button click handler to be even more defensive
// Find the Load History button section more carefully
const buttonRegex = /onClick=\{[^}]*?\}\s*variant="outline"[\s\S]*?Load History/;
const buttonMatch = content.match(buttonRegex);

if (buttonMatch) {
  // Replace the onClick handler
  const oldOnClick = /onClick=\{[^}]+\}/;
  const newOnClick = `onClick={() => {
                    console.log('[WhatsApp Frontend] Load History clicked');
                    console.log('[WhatsApp Frontend] selectedChat full object:', JSON.stringify(selectedChat, null, 2));
                    
                    if (!selectedChat) {
                      console.error('[WhatsApp Frontend] No chat selected');
                      toast({
                        title: "Error",
                        description: "Please select a chat first",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Try to extract ID from various possible structures
                    let chatId: string | undefined;
                    
                    if (typeof selectedChat === 'string') {
                      chatId = selectedChat;
                    } else if (selectedChat && typeof selectedChat === 'object') {
                      // Try different possible ID fields
                      chatId = selectedChat.id || selectedChat._id || selectedChat.chatId;
                      
                      // If chatId is still an object, try to extract its id
                      if (chatId && typeof chatId === 'object') {
                        console.warn('[WhatsApp Frontend] chatId is an object, attempting to extract ID:', chatId);
                        chatId = (chatId as any).id || (chatId as any)._id || String(chatId);
                      }
                    }
                    
                    // Convert to string and validate
                    if (chatId) {
                      chatId = String(chatId);
                      
                      // Final validation
                      if (chatId === '[object Object]' || chatId.includes('[object')) {
                        console.error('[WhatsApp Frontend] ❌ Chat ID converted to [object Object]');
                        console.error('[WhatsApp Frontend] Original selectedChat:', selectedChat);
                        toast({
                          title: "Error",
                          description: "Invalid chat format. Please try selecting the chat again.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      console.log('[WhatsApp Frontend] ✅ Loading history for valid chatId:', chatId);
                      fetchChatHistory(chatId, 10);
                    } else {
                      console.error('[WhatsApp Frontend] Could not extract valid chat ID from:', selectedChat);
                      toast({
                        title: "Error",
                        description: "Could not identify chat. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}`;
  
  // Find the exact position of the onClick handler in the button
  const buttonStartIndex = content.indexOf('onClick={', content.indexOf('Load History') - 2000);
  if (buttonStartIndex !== -1) {
    // Find the matching closing brace
    let braceCount = 0;
    let endIndex = buttonStartIndex + 9; // Start after 'onClick={'
    for (let i = endIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
        braceCount--;
      }
    }
    
    const before = content.substring(0, buttonStartIndex);
    const after = content.substring(endIndex);
    content = before + newOnClick + after;
    console.log('✅ Replaced Load History button onClick with more robust version');
  }
} else {
  console.log('⚠️ Could not find Load History button');
}

// Fix 3: Also update fetchMessages to have the same validation
const oldFetchMessages = `  const fetchMessages = async (chatId?: string, forceRefresh: boolean = false) => {
    try {
      console.log(\`[WhatsApp Frontend] Fetching messages for chatId: \${chatId}, forceRefresh: \${forceRefresh}\`);`;

const newFetchMessages = `  const fetchMessages = async (chatId?: string, forceRefresh: boolean = false) => {
    try {
      // Validate chatId to prevent [object Object]
      if (chatId) {
        if (typeof chatId !== 'string' || chatId === '[object Object]' || chatId.includes('[object')) {
          console.error('[WhatsApp Frontend] ❌ Invalid chatId in fetchMessages:', chatId);
          return;
        }
      }
      
      console.log(\`[WhatsApp Frontend] Fetching messages for chatId: \${chatId}, forceRefresh: \${forceRefresh}\`);`;

if (content.includes('const fetchMessages = async (chatId?: string, forceRefresh: boolean = false) => {')) {
  content = content.replace(oldFetchMessages, newFetchMessages);
  console.log('✅ Added validation to fetchMessages');
}

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('\n✅ Robust chat ID validation applied!');
console.log('The frontend now has multiple layers of validation to prevent [object Object] errors.');
console.log('\nPlease rebuild and restart the frontend for changes to take effect.');
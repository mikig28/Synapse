const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Applying EMERGENCY fix for [object Object] chat ID issue...');
console.log('This fix will add multiple failsafes to prevent the error.');

// Fix 1: Replace the entire fetchChatHistory function with a bulletproof version
const fetchChatHistoryStart = content.indexOf('const fetchChatHistory = async (chatId: string, limit: number = 10) => {');
if (fetchChatHistoryStart !== -1) {
  // Find the end of the function
  let braceCount = 0;
  let inFunction = false;
  let functionEnd = fetchChatHistoryStart;
  
  for (let i = fetchChatHistoryStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inFunction = true;
    }
    if (content[i] === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        functionEnd = i + 1;
        break;
      }
    }
  }
  
  const newFetchChatHistory = `const fetchChatHistory = async (chatId: string, limit: number = 10) => {
    try {
      // CRITICAL: Prevent [object Object] from being sent to API
      console.log('[WhatsApp Frontend] fetchChatHistory called with:', {
        chatId,
        chatIdType: typeof chatId,
        isObjectString: chatId === '[object Object]',
        chatIdStringified: String(chatId)
      });
      
      // Multiple validation layers
      if (!chatId) {
        console.error('[WhatsApp Frontend] No chatId provided to fetchChatHistory');
        toast({
          title: "Error",
          description: "No chat selected",
          variant: "destructive",
        });
        setFetchingHistory(false);
        return;
      }
      
      // Check if it's literally "[object Object]"
      if (chatId === '[object Object]' || chatId.includes('[object') || chatId.includes('Object]')) {
        console.error('[WhatsApp Frontend] BLOCKED: Attempted to send [object Object] as chatId');
        console.error('[WhatsApp Frontend] This indicates selectedChat.id is an object, not a string');
        toast({
          title: "Error", 
          description: "Invalid chat format. Please refresh the page and try again.",
          variant: "destructive",
        });
        setFetchingHistory(false);
        return;
      }
      
      // Check type
      if (typeof chatId !== 'string') {
        console.error('[WhatsApp Frontend] chatId is not a string:', typeof chatId, chatId);
        toast({
          title: "Error",
          description: "Invalid chat ID type",
          variant: "destructive",
        });
        setFetchingHistory(false);
        return;
      }
      
      // Final validation - ensure it's a valid WhatsApp ID format
      if (!chatId.includes('@') && chatId.length < 5) {
        console.warn('[WhatsApp Frontend] Suspicious chatId format:', chatId);
      }
      
      setFetchingHistory(true);
      console.log('[WhatsApp Frontend] Proceeding with valid chatId:', chatId);
      
      // Prefer WAHA modern endpoint; fallback to legacy
      let response: any;
      try {
        const wahaUrl = \`/waha/messages?chatId=\${encodeURIComponent(chatId)}&limit=\${limit}\`;
        console.log('[WhatsApp Frontend] Calling WAHA endpoint:', wahaUrl);
        response = await api.get(wahaUrl);
      } catch (wahaError) {
        console.log('WAHA endpoint failed, trying legacy:', wahaError);
        const legacyUrl = \`/whatsapp/messages?chatId=\${encodeURIComponent(chatId)}&limit=\${limit}\`;
        console.log('[WhatsApp Frontend] Calling legacy endpoint:', legacyUrl);
        response = await api.get(legacyUrl);
      }
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const historicalMessages = response.data.data;
        
        // Merge with existing messages, avoiding duplicates
        setMessages(prevMessages => {
          const existingIds = new Set(prevMessages.map(m => m.id));
          const newMessages = historicalMessages.filter((msg: WhatsAppMessage) => !existingIds.has(msg.id));
          const updatedMessages = [...prevMessages, ...newMessages];
          
          // Update cache
          if (chatId) {
            setMessagesCache(prev => ({
              ...prev,
              [chatId]: updatedMessages
            }));
          }
          
          return updatedMessages;
        });
        
        toast({
          title: "Chat History Loaded",
          description: \`Loaded \${historicalMessages.length} historical messages\`,
        });
      } else {
        toast({
          title: "No History Available",
          description: "No additional messages found for this chat",
        });
      }
    } catch (error: any) {
      console.error('[WhatsApp Frontend] Error in fetchChatHistory:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to fetch chat history",
        variant: "destructive",
      });
    } finally {
      setFetchingHistory(false);
    }
  }`;

  const before = content.substring(0, fetchChatHistoryStart);
  const after = content.substring(functionEnd);
  content = before + newFetchChatHistory + after;
  console.log('✅ Replaced fetchChatHistory with bulletproof version');
}

// Fix 2: Find ALL Load History buttons and fix them
const lines = content.split('\n');
let fixedButtons = 0;

for (let i = 0; i < lines.length; i++) {
  // Look for Load History button patterns
  if (lines[i].includes("'Load History'") || lines[i].includes('"Load History"')) {
    // Search backwards for the onClick handler
    for (let j = i; j >= Math.max(0, i - 50); j--) {
      if (lines[j].includes('onClick={') || lines[j].includes('onClick={() =>')) {
        // Found the onClick, now look for fetchChatHistory call
        for (let k = j; k < Math.min(lines.length, j + 30); k++) {
          if (lines[k].includes('fetchChatHistory(')) {
            // Check what's being passed
            const match = lines[k].match(/fetchChatHistory\(([^,)]+)/);
            if (match) {
              const param = match[1].trim();
              
              // If it's directly using selectedChat.id or similar, wrap it
              if (param.includes('selectedChat') || param.includes('chat.id') || param.includes('group.id')) {
                // Replace with safer version
                const originalLine = lines[k];
                lines[k] = lines[k].replace(
                  /fetchChatHistory\([^)]+\)/,
                  `(() => {
                    const id = ${param};
                    if (typeof id === 'string' && id !== '[object Object]') {
                      fetchChatHistory(id, 10);
                    } else {
                      console.error('[WhatsApp Frontend] Invalid ID detected:', id);
                      toast({
                        title: "Error",
                        description: "Invalid chat selected",
                        variant: "destructive",
                      });
                    }
                  })()`
                );
                
                if (lines[k] !== originalLine) {
                  fixedButtons++;
                  console.log(`✅ Fixed button at line ${k + 1}`);
                }
              }
            }
            break;
          }
        }
        break;
      }
    }
  }
}

if (fixedButtons > 0) {
  content = lines.join('\n');
  console.log(`✅ Fixed ${fixedButtons} Load History button(s)`);
}

// Fix 3: Add a safeguard wrapper function
if (!content.includes('const safeGetChatId')) {
  // Add the helper function near the top of the component
  const componentStart = content.indexOf('const WhatsAppPage: React.FC = () => {');
  if (componentStart !== -1) {
    const insertPoint = content.indexOf('{', componentStart) + 1;
    const safeHelper = `
  
  // Helper function to safely extract chat ID
  const safeGetChatId = (chat: any): string | null => {
    if (!chat) return null;
    
    let id = chat.id || chat._id || chat.chatId;
    
    if (typeof id === 'object' && id !== null) {
      console.warn('[WhatsApp Frontend] Chat ID is an object:', id);
      id = id.id || id._id || null;
    }
    
    if (id) {
      id = String(id);
      if (id === '[object Object]' || id.includes('[object')) {
        console.error('[WhatsApp Frontend] Invalid chat ID detected:', chat);
        return null;
      }
    }
    
    return id;
  };
`;
    
    content = content.substring(0, insertPoint) + safeHelper + content.substring(insertPoint);
    console.log('✅ Added safeGetChatId helper function');
  }
}

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('\n🚨 EMERGENCY FIX APPLIED! 🚨');
console.log('The frontend now has multiple layers of protection against [object Object] errors.');
console.log('\n📝 Next steps:');
console.log('1. Commit these changes: git add -A && git commit -m "Emergency fix for [object Object] chat ID"');
console.log('2. Push to repository: git push origin main');
console.log('3. Deploy to production');
console.log('4. Clear browser cache and test');
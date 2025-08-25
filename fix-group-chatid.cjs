const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing group chat ID issue in WhatsAppPage.tsx...');

// Fix 1: Add validation to fetchChatHistory to ensure chatId is a string
const oldFetchChatHistory = `  const fetchChatHistory = async (chatId: string, limit: number = 10) => {
    try {
      setFetchingHistory(true);
      
      // Prefer WAHA modern endpoint; fallback to legacy
      let response: any;
      try {
        response = await api.get(\`/waha/messages?chatId=\${encodeURIComponent(chatId)}&limit=\${limit}\`);`;

const newFetchChatHistory = `  const fetchChatHistory = async (chatId: string, limit: number = 10) => {
    try {
      setFetchingHistory(true);
      
      // Validate chatId is actually a string
      if (!chatId || typeof chatId !== 'string') {
        console.error('[WhatsApp Frontend] Invalid chatId passed to fetchChatHistory:', chatId, typeof chatId);
        toast({
          title: "Error",
          description: "Invalid chat selected. Please try selecting the chat again.",
          variant: "destructive",
        });
        setFetchingHistory(false);
        return;
      }
      
      console.log(\`[WhatsApp Frontend] Fetching chat history for chatId: \${chatId}\`);
      
      // Prefer WAHA modern endpoint; fallback to legacy
      let response: any;
      try {
        response = await api.get(\`/waha/messages?chatId=\${encodeURIComponent(chatId)}&limit=\${limit}\`);`;

// Apply Fix 1
if (content.includes('const fetchChatHistory = async (chatId: string, limit: number = 10) => {')) {
  content = content.replace(oldFetchChatHistory, newFetchChatHistory);
  console.log('✅ Added validation to fetchChatHistory');
} else {
  console.log('⚠️ Could not find fetchChatHistory pattern');
}

// Fix 2: Ensure the Load History button passes the correct ID
const oldLoadHistoryButton = `onClick={() => fetchChatHistory(selectedChat.id, 10)}`;
const newLoadHistoryButton = `onClick={() => {
                          if (selectedChat && selectedChat.id && typeof selectedChat.id === 'string') {
                            fetchChatHistory(selectedChat.id, 10);
                          } else {
                            console.error('[WhatsApp Frontend] Invalid selectedChat:', selectedChat);
                            toast({
                              title: "Error",
                              description: "Please select a chat first",
                              variant: "destructive",
                            });
                          }
                        }}`;

// Apply Fix 2
if (content.includes(oldLoadHistoryButton)) {
  content = content.replace(oldLoadHistoryButton, newLoadHistoryButton);
  console.log('✅ Fixed Load History button click handler');
} else {
  console.log('⚠️ Could not find Load History button pattern');
}

// Fix 3: Also fix the Refresh button similarly
const oldRefreshButton = `onClick={() => fetchMessages(selectedChat.id, true)}`;
const newRefreshButton = `onClick={() => {
                          if (selectedChat && selectedChat.id && typeof selectedChat.id === 'string') {
                            fetchMessages(selectedChat.id, true);
                          } else {
                            console.error('[WhatsApp Frontend] Invalid selectedChat for refresh:', selectedChat);
                            toast({
                              title: "Error",
                              description: "Please select a chat first",
                              variant: "destructive",
                            });
                          }
                        }}`;

if (content.includes(oldRefreshButton)) {
  content = content.replace(oldRefreshButton, newRefreshButton);
  console.log('✅ Fixed Refresh button click handler');
} else {
  console.log('⚠️ Could not find Refresh button pattern');
}

// Fix 4: Add logging when selecting a group
const oldGroupClick = `                          onClick={() => {
                            if (group.id && typeof group.id === 'string') {
                              console.log(\`[WhatsApp Frontend] Selected group: \${group.name} (\${group.id})\`);
                              setSelectedChat(group);`;

const newGroupClick = `                          onClick={() => {
                            if (group.id && typeof group.id === 'string') {
                              console.log(\`[WhatsApp Frontend] Selected group: \${group.name} (\${group.id})\`, group);
                              console.log('[WhatsApp Frontend] Group object structure:', { 
                                id: group.id, 
                                idType: typeof group.id,
                                name: group.name,
                                isGroup: group.isGroup
                              });
                              setSelectedChat(group);`;

if (content.includes(oldGroupClick)) {
  content = content.replace(oldGroupClick, newGroupClick);
  console.log('✅ Added detailed logging for group selection');
} else {
  console.log('⚠️ Could not find group click pattern');
}

// Fix 5: Check the fetchMessages function too
const oldFetchMessages = `  const fetchMessages = async (chatId?: string, forceRefresh: boolean = false) => {
    try {
      console.log(\`[WhatsApp Frontend] Fetching messages for chatId: \${chatId}, forceRefresh: \${forceRefresh}\`);`;

const newFetchMessages = `  const fetchMessages = async (chatId?: string, forceRefresh: boolean = false) => {
    try {
      // Validate chatId if provided
      if (chatId && typeof chatId !== 'string') {
        console.error('[WhatsApp Frontend] Invalid chatId type in fetchMessages:', typeof chatId, chatId);
        return;
      }
      
      console.log(\`[WhatsApp Frontend] Fetching messages for chatId: \${chatId}, forceRefresh: \${forceRefresh}\`);`;

if (content.includes('const fetchMessages = async (chatId?: string, forceRefresh: boolean = false) => {')) {
  const startIdx = content.indexOf('const fetchMessages = async (chatId?: string, forceRefresh: boolean = false) => {');
  const endIdx = content.indexOf('console.log(`[WhatsApp Frontend] Fetching messages for chatId:', startIdx) + 100;
  if (startIdx !== -1 && endIdx > startIdx) {
    const currentSection = content.substring(startIdx, endIdx);
    if (!currentSection.includes('Validate chatId if provided')) {
      content = content.replace(oldFetchMessages, newFetchMessages);
      console.log('✅ Added validation to fetchMessages');
    } else {
      console.log('ℹ️ fetchMessages already has validation');
    }
  }
} else {
  console.log('⚠️ Could not find fetchMessages pattern');
}

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('\n✅ Group chat ID issue fixes applied!');
console.log('The frontend should now properly handle group chat IDs.');
console.log('\nPlease restart the frontend for changes to take effect.');
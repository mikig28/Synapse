const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing group [object Object] issue comprehensively...');

// The core issue is the onClick handlers need better formatting
// Let's fix the Load History button more carefully

// Find and replace the Load History button section
const loadHistorySection = content.match(/(\s+)<AnimatedButton\s+onClick=\{[^}]+\}\s+variant="outline"[\s\S]*?Load History[^<]*<\/AnimatedButton>/);

if (loadHistorySection) {
  const indent = loadHistorySection[1];
  const oldButton = loadHistorySection[0];
  
  const newButton = `${indent}<AnimatedButton
${indent}  onClick={() => {
${indent}    console.log('[WhatsApp Frontend] Load History clicked, selectedChat:', selectedChat);
${indent}    if (selectedChat && selectedChat.id) {
${indent}      const chatId = String(selectedChat.id);
${indent}      if (chatId && chatId !== '[object Object]') {
${indent}        console.log('[WhatsApp Frontend] Loading history for chatId:', chatId);
${indent}        fetchChatHistory(chatId, 10);
${indent}      } else {
${indent}        console.error('[WhatsApp Frontend] Invalid chat ID detected:', chatId);
${indent}        toast({
${indent}          title: "Error",
${indent}          description: "Invalid chat selected. Please try again.",
${indent}          variant: "destructive",
${indent}        });
${indent}      }
${indent}    } else {
${indent}      console.error('[WhatsApp Frontend] No chat selected');
${indent}      toast({
${indent}        title: "Error",
${indent}        description: "Please select a chat first",
${indent}        variant: "destructive",
${indent}      });
${indent}    }
${indent}  }}
${indent}  variant="outline"
${indent}  size="sm"
${indent}  disabled={fetchingHistory}
${indent}  className="border-orange-400/30 text-orange-200 hover:bg-orange-500/10 flex-shrink-0"
${indent}>
${indent}  {fetchingHistory ? (
${indent}    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
${indent}  ) : (
${indent}    <Download className="w-4 h-4 mr-1" />
${indent}  )}
${indent}  {!isMobile && 'Load History'}
${indent}</AnimatedButton>`;

  content = content.replace(oldButton, newButton);
  console.log('✅ Completely replaced Load History button with safer version');
} else {
  console.log('⚠️ Could not find Load History button to replace');
}

// Similarly fix the Refresh button
const refreshSection = content.match(/(\s+)<AnimatedButton\s+onClick=\{[^}]+\}\s+variant="outline"[\s\S]*?Refresh[^<]*<\/AnimatedButton>/);

if (refreshSection) {
  const indent = refreshSection[1];
  const oldButton = refreshSection[0];
  
  const newButton = `${indent}<AnimatedButton
${indent}  onClick={() => {
${indent}    console.log('[WhatsApp Frontend] Refresh clicked, selectedChat:', selectedChat);
${indent}    if (selectedChat && selectedChat.id) {
${indent}      const chatId = String(selectedChat.id);
${indent}      if (chatId && chatId !== '[object Object]') {
${indent}        console.log('[WhatsApp Frontend] Refreshing messages for chatId:', chatId);
${indent}        fetchMessages(chatId, true);
${indent}      } else {
${indent}        console.error('[WhatsApp Frontend] Invalid chat ID detected:', chatId);
${indent}        toast({
${indent}          title: "Error",
${indent}          description: "Invalid chat selected. Please try again.",
${indent}          variant: "destructive",
${indent}        });
${indent}      }
${indent}    } else {
${indent}      console.error('[WhatsApp Frontend] No chat selected');
${indent}      toast({
${indent}        title: "Error",
${indent}        description: "Please select a chat first",
${indent}        variant: "destructive",
${indent}      });
${indent}    }
${indent}  }}
${indent}  variant="outline"
${indent}  size="sm"
${indent}  disabled={refreshingMessages}
${indent}  className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10 flex-shrink-0"
${indent}  title="Refresh messages from server"
${indent}>
${indent}  {refreshingMessages ? (
${indent}    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
${indent}  ) : (
${indent}    <RefreshCw className="w-4 h-4 mr-1" />
${indent}  )}
${indent}  {!isMobile && 'Refresh'}
${indent}</AnimatedButton>`;

  content = content.replace(oldButton, newButton);
  console.log('✅ Completely replaced Refresh button with safer version');
} else {
  console.log('⚠️ Could not find Refresh button to replace');
}

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('\n✅ Fixed [object Object] issue for group chats!');
console.log('The buttons now properly validate and convert chat IDs to strings.');
console.log('\nPlease restart the frontend for changes to take effect.');
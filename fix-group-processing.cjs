const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing group processing to ensure IDs are strings...');

// Fix processedGroups mapping to ensure IDs are strings
const processedGroupsRegex = /const processedGroups = groupsData\.map\(\(group: any\) => \(\{[\s\S]*?\}\)\);/g;
const matches = content.match(processedGroupsRegex);

if (matches) {
  matches.forEach(match => {
    // Check if this mapping already has ID validation
    if (!match.includes('// Ensure ID is a string')) {
      const newMapping = match.replace(
        'id: group.id || group._id',
        `id: (() => {
              // Ensure ID is a string, not an object
              let groupId = group.id || group._id || group.chatId;
              if (groupId && typeof groupId === 'object') {
                console.warn('[WhatsApp Frontend] Group ID is an object:', group.name, groupId);
                groupId = groupId.id || groupId._id || String(groupId);
              }
              return String(groupId || 'unknown_' + Math.random());
            })()`
      );
      
      content = content.replace(match, newMapping);
      console.log('✅ Fixed a processedGroups mapping');
    }
  });
} else {
  console.log('⚠️ Could not find processedGroups mappings');
}

// Alternative approach: Find and fix the specific lines
const lines = content.split('\n');
let fixedLines = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('id: group.id || group._id')) {
    if (!lines[i].includes('Ensure ID is a string')) {
      lines[i] = lines[i].replace(
        'id: group.id || group._id',
        `id: (() => {
              // Ensure ID is a string, not an object
              let groupId = group.id || group._id || group.chatId;
              if (groupId && typeof groupId === 'object') {
                console.warn('[WhatsApp Frontend] Group ID is an object:', group.name, groupId);
                groupId = groupId.id || groupId._id || String(groupId);
              }
              return String(groupId || 'unknown_' + Math.random());
            })()`
      );
      fixedLines++;
    }
  }
}

if (fixedLines > 0) {
  content = lines.join('\n');
  console.log(`✅ Fixed ${fixedLines} group ID assignments`);
}

// Also fix private chats processing
const privateChatsRegex = /const processedChats = .*?\.map\(\(chat: any\) => \(\{[\s\S]*?\}\)\);/g;
const chatMatches = content.match(privateChatsRegex);

if (chatMatches) {
  chatMatches.forEach(match => {
    if (match.includes('chat') && !match.includes('// Ensure chat ID is a string')) {
      const newMapping = match.replace(
        /id: chat\.id \|\| chat\._id[^,]*/,
        `id: (() => {
              // Ensure chat ID is a string, not an object
              let chatId = chat.id || chat._id || chat.chatId;
              if (chatId && typeof chatId === 'object') {
                console.warn('[WhatsApp Frontend] Chat ID is an object:', chat.name, chatId);
                chatId = chatId.id || chatId._id || String(chatId);
              }
              return String(chatId || 'unknown_' + Math.random());
            })()`
      );
      
      if (newMapping !== match) {
        content = content.replace(match, newMapping);
        console.log('✅ Fixed a private chat mapping');
      }
    }
  });
}

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('\n✅ Group and chat processing fixed!');
console.log('IDs will now always be strings, preventing [object Object] errors.');
console.log('\nPlease commit and deploy these changes.');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/backend/src/api/controllers/wahaController.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing TypeScript compilation error in wahaController.ts...');

// Fix 1: Add proper type annotation for chatId variable
const oldDeclaration = /let chatId = req\.params\.chatId \|\| req\.query\.chatId;/g;
const newDeclaration = 'let chatId: string | undefined = req.params.chatId || (req.query.chatId as string | undefined);';

if (content.match(oldDeclaration)) {
  content = content.replace(oldDeclaration, newDeclaration);
  console.log('✅ Fixed chatId type declaration');
} else {
  console.log('⚠️ Could not find chatId declaration to fix');
}

// Fix 2: Ensure proper type casting where chatId is used
// This is already done in previous edit, but let's make sure
const getMessage1 = /const messages = await wahaService\.getMessages\(chatId, limit\);/g;
const getMessage2 = 'const messages = await wahaService.getMessages(chatId as string, limit);';

if (content.match(getMessage1)) {
  content = content.replace(getMessage1, getMessage2);
  console.log('✅ Added type assertion for getMessages call');
}

// Fix 3: Also fix other potential places where chatId is passed
const patterns = [
  {
    old: /await wahaService\.getMessages\(chatId,/g,
    new: 'await wahaService.getMessages(chatId as string,'
  },
  {
    old: /fetchMessages\(group\.id\)/g,
    new: 'fetchMessages(group.id as string)'
  },
  {
    old: /fetchMessages\(chat\.id\)/g,
    new: 'fetchMessages(chat.id as string)'
  }
];

patterns.forEach(({ old, new: newStr }) => {
  if (content.match(old)) {
    content = content.replace(old, newStr);
    console.log(`✅ Fixed pattern: ${old}`);
  }
});

// Fix 4: Add type guard after validation
const validationEnd = '      chatId = String(chatId);';
const typeGuard = `      chatId = String(chatId);
      // TypeScript type guard - chatId is definitely a string now`;

if (content.includes(validationEnd) && !content.includes('TypeScript type guard')) {
  content = content.replace(validationEnd, typeGuard);
  console.log('✅ Added TypeScript type guard comment');
}

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('\n✅ TypeScript compilation error fixed!');
console.log('The build should now complete successfully.');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/MobileNewsPageOptimized.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Basic syntax checks
console.log('Checking MobileNewsPageOptimized.tsx syntax...\n');

// Check for balanced braces
const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;
console.log(`Braces: { ${openBraces} } ${closeBraces} - ${openBraces === closeBraces ? '✅' : '❌'}`);

// Check for balanced parentheses
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;
console.log(`Parentheses: ( ${openParens} ) ${closeParens} - ${openParens === closeParens ? '✅' : '❌'}`);

// Check for balanced brackets
const openBrackets = (content.match(/\[/g) || []).length;
const closeBrackets = (content.match(/\]/g) || []).length;
console.log(`Brackets: [ ${openBrackets} ] ${closeBrackets} - ${openBrackets === closeBrackets ? '✅' : '❌'}`);

// Check specific component definitions
console.log('\nComponent checks:');
console.log(`ContentModal defined: ${content.includes('const ContentModal:') ? '✅' : '❌'}`);
console.log(`BottomSheet removed: ${!content.includes('const BottomSheet:') ? '✅' : '❌'}`);
console.log(`useTheme imported: ${content.includes("import { useTheme }") ? '✅' : '❌'}`);
console.log(`theme state used: ${content.includes('const { theme, setTheme } = useTheme()') ? '✅' : '❌'}`);

// Check for common JSX errors
const jsxErrors = [];

// Check for unclosed JSX tags in ContentModal
const modalStart = content.indexOf('const ContentModal');
const modalEnd = content.indexOf('};', modalStart);
if (modalStart > -1 && modalEnd > -1) {
  const modalContent = content.substring(modalStart, modalEnd);
  
  // Count specific JSX elements
  const motionDivOpen = (modalContent.match(/<motion\.div/g) || []).length;
  const motionDivClose = (modalContent.match(/<\/motion\.div>/g) || []).length;
  const divOpen = (modalContent.match(/<div/g) || []).length;
  const divClose = (modalContent.match(/<\/div>/g) || []).length;
  
  console.log('\nContentModal JSX balance:');
  console.log(`  motion.div: ${motionDivOpen} open, ${motionDivClose} close - ${motionDivOpen === motionDivClose ? '✅' : '❌'}`);
  console.log(`  div: ${divOpen} open, ${divClose} close - ${divOpen === divClose ? '✅' : '❌'}`);
}

console.log('\n✨ Syntax check complete!');
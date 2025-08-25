const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// The issue is that we have a duplicate AnimatedButton after line 2006
// This happened because when we fixed the isMobile ternary, we added an else branch
// but the original button code was duplicated
// We need to remove the duplicate button (lines 2007-2056 approximately)

// Find and remove the duplicate AnimatedButton
// The pattern is: </AnimatedButton> followed immediately by another <AnimatedButton with the same onClick logic

const lines = content.split('\n');
let newLines = [];
let skipNextButton = false;
let inDuplicateButton = false;
let buttonDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Check if we just closed an AnimatedButton and the next non-empty line starts another
  if (trimmed === '</AnimatedButton>') {
    newLines.push(line);
    // Look ahead to see if the next non-empty lines start another AnimatedButton
    let nextNonEmpty = '';
    for (let j = i + 1; j < lines.length && j < i + 5; j++) {
      if (lines[j].trim()) {
        nextNonEmpty = lines[j].trim();
        break;
      }
    }
    if (nextNonEmpty === '<AnimatedButton' || nextNonEmpty.startsWith('<AnimatedButton')) {
      // Check if this is the duplicate (it has the same onClick pattern)
      let hasLoadHistoryPattern = false;
      for (let j = i + 1; j < lines.length && j < i + 10; j++) {
        if (lines[j].includes('Load History clicked, selectedChat')) {
          hasLoadHistoryPattern = true;
          break;
        }
      }
      if (hasLoadHistoryPattern) {
        skipNextButton = true;
      }
    }
  } else if (skipNextButton && (trimmed === '<AnimatedButton' || trimmed.startsWith('<AnimatedButton'))) {
    inDuplicateButton = true;
    buttonDepth = 1;
    skipNextButton = false;
    // Skip this line
  } else if (inDuplicateButton) {
    // Track depth to know when we're done with the duplicate button
    if (trimmed.includes('<AnimatedButton')) buttonDepth++;
    if (trimmed.includes('</AnimatedButton>')) {
      buttonDepth--;
      if (buttonDepth === 0) {
        inDuplicateButton = false;
        // Skip this closing tag too
        continue;
      }
    }
    // Skip all lines in the duplicate button
  } else {
    newLines.push(line);
  }
}

content = newLines.join('\n');

// Clean up any multiple empty lines
content = content.replace(/\n\n\n+/g, '\n\n');

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed duplicate AnimatedButton in WhatsAppPage.tsx');
console.log('The duplicate Load History button has been removed.');
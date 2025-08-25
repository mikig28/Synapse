const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/frontend/src/pages/WhatsAppPage.tsx');

console.log('Reading WhatsAppPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the broken ternary operator for fetchingHistory
// The pattern has the "?" but is missing the ": (" between the two components
content = content.replace(
  /\{fetchingHistory \? \([\s\r\n]*<RefreshCw[^>]*\/>[\s\r\n]*<Download[^>]*\/>[\s\r\n]*\)\}/gm,
  `{fetchingHistory ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}`
);

// Also handle cases where there might be different spacing
content = content.replace(
  /\{fetchingHistory\s*\?\s*\([^)]*<RefreshCw[^>]*\/>[^)]*<Download[^>]*\/>[^)]*\)\}/gms,
  `{fetchingHistory ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}`
);

console.log('Writing fixed content back to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed ternary operator in WhatsAppPage.tsx');
console.log('The fetchingHistory conditional now properly shows RefreshCw when loading and Download when not.');
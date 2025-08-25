// Debug script to check what's happening on the live site
console.log('=== Telegram Channels Debug ===');

// Check if we're on the right page
console.log('Current URL:', window.location.href);

// Check if the page has loaded
console.log('Page loaded:', document.readyState);

// Look for bot status elements
const botStatusElements = document.querySelectorAll('[data-testid*="bot"], [class*="bot"], [class*="Bot"]');
console.log('Bot status elements found:', botStatusElements.length);

// Look for diagnostic elements
const diagnosticElements = document.querySelectorAll('[class*="diagnostic"], [class*="Diagnostic"], [class*="alert"], [class*="Alert"]');
console.log('Diagnostic elements found:', diagnosticElements.length);

// Check for any error messages in console
console.log('Console errors (if any):');
console.error('This is a test error to see console');

// Check if React is loaded
console.log('React loaded:', typeof window.React !== 'undefined');

// Check for any React components
const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
console.log('React elements found:', reactElements.length);

// Look for specific text content
const pageText = document.body.innerText || document.body.textContent || '';
console.log('Page contains "diagnostic":', pageText.toLowerCase().includes('diagnostic'));
console.log('Page contains "bot status":', pageText.toLowerCase().includes('bot status'));
console.log('Page contains "SynapseCaptureBot":', pageText.includes('SynapseCaptureBot'));

// Check current git commit (if visible anywhere)
const metaTags = Array.from(document.querySelectorAll('meta')).map(m => m.content);
console.log('Meta tags:', metaTags);

console.log('=== End Debug ===');
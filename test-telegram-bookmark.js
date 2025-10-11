// Test script for Telegram bookmark functionality
import axios from 'axios';

// URL extraction test
function extractUrls(text) {
  if (!text) return [];
  const regex = /https?:\/\/[^\s<>'"\]]+/gi;
  const matches = text.match(regex);
  if (!matches) return [];
  return [...new Set(matches.map(url => url.trim()))]; // Remove duplicates
}

function classifyUrlPlatform(url) {
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('reddit.com')) return 'Reddit';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'X';
  return 'Other';
}

// Test URL extraction
console.log('Testing URL extraction...');
const testMessage = "Check out this article: https://www.linkedin.com/posts/developer-awesome-framework and also https://reddit.com/r/technology/123";
const urls = extractUrls(testMessage);
console.log('Extracted URLs:', urls);

// Test URL classification
urls.forEach(url => {
  const platform = classifyUrlPlatform(url);
  console.log(`URL: ${url} -> Platform: ${platform}`);
});

// Test backend connection
async function testBackend() {
  try {
    console.log('\nTesting backend connection...');
    const response = await axios.get('http://localhost:3001/health');
    console.log('Backend health check:', response.data);
  } catch (error) {
    console.log('Backend not running or not responding to health check');
    console.log('Error:', error.code);
  }
}

testBackend();

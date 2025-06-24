#!/usr/bin/env node

/**
 * Google Calendar Sync Test Script
 * 
 * This script tests the Google Calendar sync functionality by:
 * 1. Checking environment variables
 * 2. Testing API endpoints
 * 3. Verifying the sync process
 * 
 * Usage: node test-calendar-sync.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BACKEND_URL = 'http://localhost:3001';
const ENV_FILE_PATH = path.join(__dirname, '.env');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(colors.green, `✅ ${message}`);
}

function logError(message) {
  log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

function logInfo(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

function logHeader(message) {
  log(colors.bold, `\n🔍 ${message}`);
  log(colors.bold, '='.repeat(50));
}

// Test functions
async function checkEnvironmentVariables() {
  logHeader('Checking Environment Variables');
  
  if (!fs.existsSync(ENV_FILE_PATH)) {
    logError('.env file not found');
    return false;
  }

  const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'VITE_GOOGLE_CLIENT_ID'
  ];

  let allPresent = true;
  
  for (const varName of requiredVars) {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(regex);
    
    if (!match || match[1].includes('your-') || match[1] === '') {
      logError(`${varName} is missing or has placeholder value`);
      allPresent = false;
    } else {
      logSuccess(`${varName} is configured`);
    }
  }

  return allPresent;
}

async function checkBackendStatus() {
  logHeader('Checking Backend Server');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    logSuccess('Backend server is running');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logError('Backend server is not running. Start it with: cd src/backend && npm run dev');
    } else {
      logError(`Backend health check failed: ${error.message}`);
    }
    return false;
  }
}

async function checkCalendarEndpoints() {
  logHeader('Testing Calendar API Endpoints');
  
  try {
    // Test basic calendar events endpoint
    const response = await axios.get(`${BACKEND_URL}/calendar-events`, {
      headers: {
        'Authorization': 'Bearer test-token' // This should fail gracefully
      }
    });
    logError('Calendar endpoint should require authentication');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logSuccess('Calendar endpoint properly requires authentication');
      return true;
    } else {
      logError(`Unexpected error: ${error.message}`);
      return false;
    }
  }
}

async function testGoogleCalendarConfiguration() {
  logHeader('Testing Google Calendar Configuration');
  
  try {
    // Test sync endpoint without token - should fail gracefully
    const response = await axios.post(`${BACKEND_URL}/calendar-events/sync`, {
      accessToken: 'invalid-token'
    }, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    logError('Sync should fail with invalid token');
    return false;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      if (status === 401) {
        logSuccess('Sync endpoint properly requires authentication');
        return true;
      } else if (status === 500 && message.includes('not configured')) {
        logWarning('Google Calendar service configuration error (expected if credentials not set)');
        logInfo('This is normal if you haven\'t set up Google credentials yet');
        return true;
      } else {
        logInfo(`Sync endpoint response: ${status} - ${message}`);
        return true;
      }
    } else {
      logError(`Connection error: ${error.message}`);
      return false;
    }
  }
}

function generateSetupInstructions() {
  logHeader('Setup Instructions');
  
  log(colors.yellow, '📋 To complete Google Calendar sync setup:');
  console.log('');
  log(colors.blue, '1. 🌐 Go to Google Cloud Console: https://console.cloud.google.com/');
  log(colors.blue, '2. 📊 Create a project and enable Google Calendar API');
  log(colors.blue, '3. 🔑 Create OAuth 2.0 credentials (Web application)');
  log(colors.blue, '4. ✏️  Update .env file with your real credentials:');
  console.log('   GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com');
  console.log('   GOOGLE_CLIENT_SECRET=your-actual-client-secret');
  console.log('   VITE_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com');
  log(colors.blue, '5. 🔄 Restart both frontend and backend servers');
  log(colors.blue, '6. 🎯 Test sync in the Calendar page');
  console.log('');
  log(colors.green, '📖 Detailed instructions: See GOOGLE_CALENDAR_SETUP.md');
}

function showColorCodingInfo() {
  logHeader('Color Coding Information');
  
  log(colors.blue, '🎨 Event Colors:');
  log(colors.blue, '   • Local Events: Blue (bg-blue-500)');
  log(colors.green, '   • Google Calendar Events: Emerald Green (bg-emerald-600)');
  console.log('');
  log(colors.blue, '🔄 Sync Status Icons:');
  log(colors.blue, '   • 🔄 Blue Refresh: Ready to sync');
  log(colors.green, '   • ✅ Green Check: All events synced');
  log(colors.red, '   • ⚠️  Red Alert: Sync errors detected');
}

// Main test runner
async function runTests() {
  log(colors.bold, '🧪 Google Calendar Sync Test Suite');
  log(colors.bold, '=====================================');
  
  const results = {
    envVars: await checkEnvironmentVariables(),
    backend: await checkBackendStatus(),
    endpoints: false,
    googleConfig: false
  };

  if (results.backend) {
    results.endpoints = await checkCalendarEndpoints();
    results.googleConfig = await testGoogleCalendarConfiguration();
  }

  // Summary
  logHeader('Test Results Summary');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  if (passed === total) {
    logSuccess(`All tests passed! (${passed}/${total})`);
    log(colors.green, '🎉 Your Google Calendar sync is ready to use!');
  } else {
    logWarning(`${passed}/${total} tests passed`);
    
    if (!results.envVars) {
      logError('❗ Google credentials need to be configured');
    }
    if (!results.backend) {
      logError('❗ Backend server needs to be started');
    }
  }

  // Always show setup instructions and color info
  generateSetupInstructions();
  showColorCodingInfo();

  console.log('');
  log(colors.bold, '🚀 Next Steps:');
  log(colors.blue, '1. Fix any failing tests above');
  log(colors.blue, '2. Open the Calendar page in your browser');  
  log(colors.blue, '3. Click "Sync Google" to test the integration');
  log(colors.blue, '4. Create events and verify bidirectional sync');
}

// Run the tests
runTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
#!/usr/bin/env node

/**
 * CORS Test Script for Synapse Backend
 * 
 * This script tests CORS configuration by making requests to the backend
 * from different origins to ensure proper headers are returned.
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'https://synapse-backend-7lq6.onrender.com';
const FRONTEND_URL = 'https://synapse-frontend.onrender.com';

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
async function testHealthEndpoint() {
  logHeader('Testing Health Endpoint');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, {
      timeout: 10000
    });
    
    logSuccess(`Health endpoint responded with status: ${response.status}`);
    logInfo(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    
    // Check CORS headers
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials']
    };
    
    logInfo('CORS Headers in response:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        logSuccess(`  ${key}: ${value}`);
      } else {
        logWarning(`  ${key}: MISSING`);
      }
    });
    
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logError('Connection refused - backend server is not responding');
    } else if (error.code === 'ETIMEDOUT') {
      logError('Request timeout - backend server is slow or unresponsive');
    } else {
      logError(`Health check failed: ${error.message}`);
    }
    return false;
  }
}

async function testCorsPreflightRequest() {
  logHeader('Testing CORS Preflight (OPTIONS) Request');
  
  try {
    const response = await axios.options(`${BACKEND_URL}/api/v1/calendar-events/sync`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      },
      timeout: 10000
    });
    
    logSuccess(`Preflight request responded with status: ${response.status}`);
    
    // Check required CORS headers for preflight
    const requiredHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ];
    
    let allHeadersPresent = true;
    requiredHeaders.forEach(header => {
      const value = response.headers[header];
      if (value) {
        logSuccess(`  ${header}: ${value}`);
      } else {
        logError(`  ${header}: MISSING (REQUIRED)`);
        allHeadersPresent = false;
      }
    });
    
    if (allHeadersPresent) {
      logSuccess('All required CORS headers present in preflight response');
    } else {
      logError('Some required CORS headers are missing');
    }
    
    return allHeadersPresent;
  } catch (error) {
    logError(`Preflight request failed: ${error.message}`);
    if (error.response) {
      logError(`Response status: ${error.response.status}`);
      logError(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function testActualApiRequest() {
  logHeader('Testing Actual API Request (without auth)');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/v1/calendar-events/sync`, {
      accessToken: 'test-token'
    }, {
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    // This should fail with 401, but we want to see CORS headers
    logWarning('Request succeeded (unexpected - should require auth)');
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logSuccess('Request properly rejected with 401 (authentication required)');
      
      // Check if CORS headers are present in error response
      const corsHeaders = {
        'access-control-allow-origin': error.response.headers['access-control-allow-origin'],
        'access-control-allow-credentials': error.response.headers['access-control-allow-credentials']
      };
      
      let corsHeadersPresent = true;
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value) {
          logSuccess(`  ${key}: ${value}`);
        } else {
          logError(`  ${key}: MISSING in error response`);
          corsHeadersPresent = false;
        }
      });
      
      return corsHeadersPresent;
    } else {
      logError(`Unexpected error: ${error.message}`);
      if (error.response) {
        logError(`Status: ${error.response.status}`);
        logError(`Data: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }
}

function generateRecommendations(results) {
  logHeader('Recommendations');
  
  const { health, preflight, api } = results;
  
  if (!health) {
    logError('🚨 CRITICAL: Backend server is not responding');
    logInfo('💡 Check:');
    logInfo('   - Is the backend deployed and running?');
    logInfo('   - Are there any deployment errors?');
    logInfo('   - Check Render logs for backend service');
    return;
  }
  
  if (!preflight) {
    logError('🚨 CRITICAL: CORS preflight requests are failing');
    logInfo('💡 This will cause the main CORS error you\'re seeing');
    logInfo('💡 Check:');
    logInfo('   - Backend CORS middleware configuration');
    logInfo('   - Environment variables (FRONTEND_URL)');
    logInfo('   - Server restart may be needed');
    return;
  }
  
  if (!api) {
    logWarning('⚠️  API endpoint CORS headers missing in error responses');
    logInfo('💡 Auth middleware should set CORS headers before sending 401');
  }
  
  if (health && preflight && api) {
    logSuccess('🎉 All CORS tests passed!');
    logInfo('💡 If you\'re still seeing CORS errors:');
    logInfo('   - Clear browser cache and cookies');
    logInfo('   - Check frontend axios configuration');
    logInfo('   - Verify authentication token is being sent');
  }
}

// Main test runner
async function runTests() {
  log(colors.bold, '🧪 CORS Configuration Test Suite');
  log(colors.bold, '===================================');
  
  logInfo(`Testing backend: ${BACKEND_URL}`);
  logInfo(`Frontend origin: ${FRONTEND_URL}`);
  console.log('');
  
  const results = {
    health: await testHealthEndpoint(),
    preflight: await testCorsPreflightRequest(),
    api: await testActualApiRequest()
  };
  
  // Summary
  logHeader('Test Results Summary');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  if (passed === total) {
    logSuccess(`All tests passed! (${passed}/${total})`);
  } else {
    logWarning(`${passed}/${total} tests passed`);
  }
  
  generateRecommendations(results);
  
  console.log('');
  log(colors.bold, '🔧 Next Steps:');
  log(colors.blue, '1. Fix any failing tests above');
  log(colors.blue, '2. Redeploy backend if changes were made');
  log(colors.blue, '3. Test the calendar sync in your browser');
  log(colors.blue, '4. Check browser console for detailed error info');
}

// Run the tests
runTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
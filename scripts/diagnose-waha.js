#!/usr/bin/env node

/**
 * WAHA Service Diagnostic Tool
 * Helps diagnose and fix common WAHA integration issues
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded .env file');
} else {
  console.log('⚠️  No .env file found - using defaults');
}

const WAHA_SERVICE_URL = process.env.WAHA_SERVICE_URL || 'http://localhost:3001';
const WAHA_API_KEY = process.env.WAHA_API_KEY;
const BACKEND_URL = 'http://localhost:3000/api/v1';

console.log('\n🔍 WAHA Service Diagnostic Tool\n');
console.log('Configuration:');
console.log(`- WAHA Service URL: ${WAHA_SERVICE_URL}`);
console.log(`- WAHA API Key: ${WAHA_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`- Backend URL: ${BACKEND_URL}`);
console.log('\n' + '='.repeat(50) + '\n');

// Create axios instance for WAHA direct calls
const wahaClient = axios.create({
  baseURL: WAHA_SERVICE_URL,
  timeout: 10000,
  headers: WAHA_API_KEY ? { 'X-API-Key': WAHA_API_KEY } : {}
});

// Create axios instance for backend calls
const backendClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000
});

async function checkWAHAHealth() {
  console.log('1. Checking WAHA service health...');
  try {
    const response = await wahaClient.get('/health');
    console.log('✅ WAHA service is healthy:', response.data);
    return true;
  } catch (error) {
    console.error('❌ WAHA service health check failed:', error.message);
    if (error.response?.status === 401) {
      console.error('   → Authentication failed. Check WAHA_API_KEY');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   → Connection refused. Is WAHA service running?');
      console.error('   → Run: docker-compose up -d waha');
    }
    return false;
  }
}

async function checkWAHASessions() {
  console.log('\n2. Checking WAHA sessions...');
  try {
    const response = await wahaClient.get('/api/sessions');
    console.log('✅ WAHA sessions:', response.data);
    
    if (response.data.length === 0) {
      console.log('   → No sessions found. Creating default session...');
      await createDefaultSession();
    } else {
      for (const session of response.data) {
        console.log(`   → Session "${session.name}": ${session.status}`);
      }
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to check WAHA sessions:', error.message);
    return false;
  }
}

async function createDefaultSession() {
  try {
    const response = await wahaClient.post('/api/sessions', {
      name: 'default',
      config: {
        engine: 'WEBJS'
      }
    });
    console.log('✅ Created default session:', response.data);
    
    // Start the session
    await wahaClient.post('/api/sessions/default/start');
    console.log('✅ Started default session');
    
    return true;
  } catch (error) {
    if (error.response?.status === 422) {
      console.log('   → Default session already exists');
      return true;
    }
    console.error('❌ Failed to create default session:', error.message);
    return false;
  }
}

async function checkBackendConnection() {
  console.log('\n3. Checking backend WhatsApp integration...');
  try {
    const response = await backendClient.get('/whatsapp/status');
    console.log('✅ Backend WhatsApp status:', response.data);
    
    if (!response.data.data?.isReady) {
      console.log('   → WhatsApp not ready. You need to scan QR code.');
      console.log('   → Visit: http://localhost:5173/integrations/whatsapp');
    }
    return true;
  } catch (error) {
    console.error('❌ Backend WhatsApp check failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Backend service not running');
      console.error('   → Run: docker-compose up -d backend');
    }
    return false;
  }
}

async function testChatLoading() {
  console.log('\n4. Testing chat loading performance...');
  try {
    const startTime = Date.now();
    const response = await backendClient.get('/whatsapp/chats');
    const duration = Date.now() - startTime;
    
    if (response.data.success) {
      console.log(`✅ Loaded ${response.data.data.length} chats in ${duration}ms`);
      
      if (duration > 30000) {
        console.log('   ⚠️  Chat loading is slow. Consider:');
        console.log('   → Reducing WAHA_CHATS_LIMIT in .env');
        console.log('   → Running WAHA locally instead of on Render');
      }
    } else {
      console.log('❌ Chat loading failed:', response.data.error);
    }
    return true;
  } catch (error) {
    console.error('❌ Chat loading test failed:', error.message);
    if (error.code === 'ECONNABORTED') {
      console.error('   → Request timed out. Try increasing WAHA_TIMEOUT_MS in .env');
    }
    return false;
  }
}

async function provideSolutions() {
  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Recommended Solutions:\n');
  
  if (!WAHA_API_KEY) {
    console.log('1. Set WAHA_API_KEY in .env file:');
    console.log('   WAHA_API_KEY=your-secure-api-key-here');
  }
  
  console.log('\n2. For better performance, run WAHA locally:');
  console.log('   docker-compose up -d waha');
  console.log('   Update .env: WAHA_SERVICE_URL=http://localhost:3001');
  
  console.log('\n3. Configure timeout and limits in .env:');
  console.log('   WAHA_TIMEOUT_MS=30000');
  console.log('   WAHA_CHATS_LIMIT=100');
  console.log('   WAHA_MESSAGES_LIMIT=50');
  
  console.log('\n4. Monitor WAHA logs:');
  console.log('   docker-compose logs -f waha');
  
  console.log('\n5. Restart services after configuration changes:');
  console.log('   docker-compose restart backend waha');
}

// Run diagnostics
async function runDiagnostics() {
  console.log('Starting WAHA diagnostics...\n');
  
  const results = {
    wahaHealth: await checkWAHAHealth(),
    wahaSessions: false,
    backendConnection: false,
    chatLoading: false
  };
  
  if (results.wahaHealth) {
    results.wahaSessions = await checkWAHASessions();
  }
  
  if (results.wahaSessions) {
    results.backendConnection = await checkBackendConnection();
  }
  
  if (results.backendConnection) {
    results.chatLoading = await testChatLoading();
  }
  
  await provideSolutions();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Diagnostic Summary:');
  console.log(`- WAHA Health: ${results.wahaHealth ? '✅' : '❌'}`);
  console.log(`- WAHA Sessions: ${results.wahaSessions ? '✅' : '❌'}`);
  console.log(`- Backend Connection: ${results.backendConnection ? '✅' : '❌'}`);
  console.log(`- Chat Loading: ${results.chatLoading ? '✅' : '❌'}`);
  
  if (Object.values(results).every(r => r)) {
    console.log('\n✅ All checks passed! WAHA integration is working properly.');
  } else {
    console.log('\n❌ Some checks failed. Please follow the recommendations above.');
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

// Run the diagnostics
runDiagnostics().catch(console.error);
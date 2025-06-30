#!/usr/bin/env node

/**
 * CrewAI Service Progress Test
 * This script tests the connectivity and progress endpoint of the CrewAI service
 */

const axios = require('axios');

const CREWAI_SERVICE_URL = process.env.CREWAI_SERVICE_URL || 'http://localhost:5000';

async function testCrewAIService() {
  console.log('🧪 Testing CrewAI Service Progress Tracking');
  console.log('=' .repeat(50));
  console.log(`Service URL: ${CREWAI_SERVICE_URL}`);
  console.log('');

  // Test 1: Health Check
  console.log('1️⃣ Testing Health Endpoint...');
  try {
    const healthResponse = await axios.get(`${CREWAI_SERVICE_URL}/health`, { timeout: 10000 });
    console.log('✅ Health Check: SUCCESS');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Mode: ${healthResponse.data.mode || 'unknown'}`);
    console.log(`   Real News Enabled: ${healthResponse.data.real_news_enabled || 'unknown'}`);
    console.log(`   Initialized: ${healthResponse.data.initialized || 'unknown'}`);
  } catch (error) {
    console.log('❌ Health Check: FAILED');
    console.log(`   Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Service appears to be down or not accessible');
      console.log('   📝 Check if the CrewAI service is running');
      return;
    }
  }
  console.log('');

  // Test 2: Progress Endpoint (without session ID)
  console.log('2️⃣ Testing Progress Endpoint (general)...');
  try {
    const progressResponse = await axios.get(`${CREWAI_SERVICE_URL}/progress`, { timeout: 5000 });
    console.log('✅ Progress Endpoint: ACCESSIBLE');
    console.log(`   Status: ${progressResponse.status}`);
    console.log(`   Success: ${progressResponse.data.success}`);
    console.log(`   Has Active Progress: ${progressResponse.data.progress?.has_active_progress || progressResponse.data.progress?.hasActiveProgress || false}`);
    console.log(`   Progress Data: ${progressResponse.data.progress ? 'Present' : 'None'}`);
  } catch (error) {
    console.log('❌ Progress Endpoint: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // Test 3: Progress Endpoint (with sample session ID)
  console.log('3️⃣ Testing Progress Endpoint (with session ID)...');
  const testSessionId = 'news_test_session';
  try {
    const progressResponse = await axios.get(`${CREWAI_SERVICE_URL}/progress`, { 
      params: { session_id: testSessionId },
      timeout: 5000 
    });
    console.log('✅ Progress Endpoint (with session): ACCESSIBLE');
    console.log(`   Status: ${progressResponse.status}`);
    console.log(`   Success: ${progressResponse.data.success}`);
    console.log(`   Session ID: ${testSessionId}`);
    console.log(`   Progress Found: ${progressResponse.data.progress ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('❌ Progress Endpoint (with session): FAILED');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // Test 4: System Info
  console.log('4️⃣ Testing System Info Endpoint...');
  try {
    const systemResponse = await axios.get(`${CREWAI_SERVICE_URL}/system-info`, { timeout: 5000 });
    console.log('✅ System Info: SUCCESS');
    console.log(`   Service Name: ${systemResponse.data.service_name || 'Unknown'}`);
    console.log(`   Version: ${systemResponse.data.version || 'Unknown'}`);
    console.log(`   Mode: ${systemResponse.data.mode || 'Unknown'}`);
    console.log(`   Features Available: ${Object.keys(systemResponse.data.features || {}).length}`);
  } catch (error) {
    console.log('❌ System Info: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // Test 5: Connection Timing
  console.log('5️⃣ Testing Connection Timing...');
  const startTime = Date.now();
  try {
    await axios.get(`${CREWAI_SERVICE_URL}/`, { timeout: 3000 });
    const responseTime = Date.now() - startTime;
    console.log('✅ Connection Timing: SUCCESS');
    console.log(`   Response Time: ${responseTime}ms`);
    if (responseTime > 2000) {
      console.log('   ⚠️ Slow response time - service may be cold starting');
    } else if (responseTime > 1000) {
      console.log('   ⚠️ Moderate response time - service may be busy');
    } else {
      console.log('   ✅ Good response time');
    }
  } catch (error) {
    console.log('❌ Connection Timing: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  console.log('');

  // Recommendations
  console.log('📋 RECOMMENDATIONS:');
  console.log('');
  console.log('If health check fails:');
  console.log('  - Ensure CrewAI service is running');
  console.log('  - Check CREWAI_SERVICE_URL environment variable');
  console.log('  - Verify network connectivity');
  console.log('');
  console.log('If progress endpoint fails:');
  console.log('  - Service may be outdated');
  console.log('  - Check service logs for errors');
  console.log('  - Restart the CrewAI service');
  console.log('');
  console.log('If response times are slow:');
  console.log('  - Service may be cold starting (wait 1-2 minutes)');
  console.log('  - Check system resources');
  console.log('  - Consider service scaling');
}

// Check if environment variables are set
console.log('🔧 Environment Check:');
console.log(`CREWAI_SERVICE_URL: ${process.env.CREWAI_SERVICE_URL || 'Not set (using default)'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
console.log('');

// Run the test
testCrewAIService().catch(error => {
  console.error('💥 Test script failed:', error.message);
  process.exit(1);
}); 
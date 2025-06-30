#!/usr/bin/env node

/**
 * Backend Progress API Test
 * This script tests the backend's progress API endpoints
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001/api/v1';

async function testBackendProgressAPI() {
  console.log('🧪 Testing Backend Progress API');
  console.log('=' .repeat(40));
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('');

  // Test 1: Backend Health Check
  console.log('1️⃣ Testing Backend Health...');
  try {
    const healthResponse = await axios.get(`${BACKEND_URL}/agents/health`, { timeout: 5000 });
    console.log('✅ Backend Health: SUCCESS');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
  } catch (error) {
    console.log('❌ Backend Health: FAILED');
    console.log(`   Error: ${error.message}`);
    return;
  }
  console.log('');

  // Test 2: Get Agents (to find a CrewAI agent)
  console.log('2️⃣ Testing Get Agents...');
  try {
    const agentsResponse = await axios.get(`${BACKEND_URL}/agents`, {
      timeout: 5000,
      headers: {
        'Authorization': 'Bearer dummy-token-for-test' // Add if auth is required
      }
    });
    console.log('✅ Get Agents: SUCCESS');
    console.log(`   Status: ${agentsResponse.status}`);
    
    const agents = agentsResponse.data?.data || [];
    const crewaiAgents = agents.filter(agent => agent.type === 'crewai_news');
    
    console.log(`   Total Agents: ${agents.length}`);
    console.log(`   CrewAI Agents: ${crewaiAgents.length}`);
    
    if (crewaiAgents.length > 0) {
      const testAgent = crewaiAgents[0];
      console.log(`   Test Agent: ${testAgent.name} (${testAgent._id})`);
      
      // Test 3: Progress API for specific agent
      console.log('');
      console.log('3️⃣ Testing Progress API...');
      try {
                 const progressResponse = await axios.get(`${BACKEND_URL}/agents/${testAgent._id}/crew-progress`, {
          timeout: 10000,
          headers: {
            'Authorization': 'Bearer dummy-token-for-test'
          }
        });
        console.log('✅ Progress API: ACCESSIBLE');
        console.log(`   Status: ${progressResponse.status}`);
        console.log(`   Success: ${progressResponse.data.success}`);
        console.log(`   Has Progress: ${!!progressResponse.data.progress}`);
        
        if (progressResponse.data.progress) {
          const progress = progressResponse.data.progress;
          console.log(`   Active Progress: ${progress.hasActiveProgress}`);
          console.log(`   Steps: ${progress.steps?.length || 0}`);
          console.log(`   Session ID: ${progress.session_id || 'none'}`);
          console.log(`   Progress Status: ${progress.progress_status}`);
          
          if (progress.debug_info) {
            console.log(`   Service URL: ${progress.debug_info.service_url}`);
            console.log(`   Service Accessible: ${progress.debug_info.service_accessible}`);
            console.log(`   Last Error: ${progress.debug_info.last_error || 'none'}`);
          }
        }
      } catch (error) {
        console.log('❌ Progress API: FAILED');
        console.log(`   Error: ${error.message}`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Response: ${JSON.stringify(error.response.data)}`);
        }
      }
    } else {
      console.log('   ⚠️ No CrewAI agents found to test progress API');
    }
  } catch (error) {
    console.log('❌ Get Agents: FAILED');
    console.log(`   Error: ${error.message}`);
    if (error.response && error.response.status === 401) {
      console.log('   💡 This might be due to authentication requirements');
      console.log('   💡 Try logging in through the frontend first');
    }
  }
  console.log('');

  console.log('📋 NEXT STEPS:');
  console.log('1. Make sure you\'re logged in through the frontend');
  console.log('2. Create or run a CrewAI agent');
  console.log('3. Check the progress in the frontend dashboard');
  console.log('4. The backend should now be able to fetch progress from CrewAI service');
}

testBackendProgressAPI().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
}); 
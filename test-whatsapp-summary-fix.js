#!/usr/bin/env node

/**
 * Test script for WhatsApp Summary functionality
 * Tests both local and production endpoints
 */

const axios = require('axios');

// Configuration
const BACKENDS = {
  local: 'http://localhost:3001',
  production: 'https://synapse-backend-7lq6.onrender.com'
};

const API_PATH = '/api/v1/whatsapp-summary';

// Test data
const TEST_GROUP_ID = 'test-group-id'; // Replace with actual group ID from your WhatsApp
const TEST_DATE = new Date().toISOString().split('T')[0]; // Today's date

async function testEndpoint(name, baseUrl) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${name}: ${baseUrl}`);
  console.log('='.repeat(60));

  try {
    // Test 1: Get available groups
    console.log('\n1. Testing GET /groups...');
    const groupsResponse = await axios.get(`${baseUrl}${API_PATH}/groups`, {
      timeout: 10000
    });
    
    const groups = groupsResponse.data.data || [];
    console.log(`   ✓ Found ${groups.length} groups`);
    
    if (groups.length > 0) {
      console.log('   Groups:');
      groups.slice(0, 5).forEach(group => {
        console.log(`     - ${group.name} (ID: ${group.id})`);
        console.log(`       Messages: ${group.messageCount}, Participants: ${group.participantCount}`);
      });
      
      // Use first group for testing if no specific test group ID
      const testGroupId = TEST_GROUP_ID === 'test-group-id' ? groups[0].id : TEST_GROUP_ID;
      
      // Test 2: Generate daily summary
      console.log(`\n2. Testing POST /daily-summary for group: ${testGroupId}...`);
      const summaryResponse = await axios.post(
        `${baseUrl}${API_PATH}/daily-summary`,
        {
          groupId: testGroupId,
          date: TEST_DATE,
          timezone: 'Asia/Jerusalem',
          options: {
            includeMediaAnalysis: true,
            includeSentimentAnalysis: true
          }
        },
        { timeout: 30000 }
      );
      
      const summary = summaryResponse.data.data;
      console.log('   ✓ Summary generated successfully:');
      console.log(`     - Group: ${summary.groupName}`);
      console.log(`     - Total Messages: ${summary.totalMessages}`);
      console.log(`     - Active Participants: ${summary.activeParticipants}`);
      console.log(`     - Time Range: ${summary.timeRange.start} to ${summary.timeRange.end}`);
      
      if (summary.overallSummary) {
        console.log(`     - Summary: ${summary.overallSummary.substring(0, 200)}...`);
      }
      
      if (summary.aiInsights) {
        console.log('     - AI Insights:');
        console.log(`       • Key Topics: ${summary.aiInsights.keyTopics?.join(', ') || 'None'}`);
        console.log(`       • Sentiment: ${summary.aiInsights.sentiment || 'Not analyzed'}`);
        console.log(`       • Action Items: ${summary.aiInsights.actionItems?.length || 0} found`);
      }
      
      // Test 3: Get today's summary
      console.log(`\n3. Testing POST /today for group: ${testGroupId}...`);
      const todayResponse = await axios.post(
        `${baseUrl}${API_PATH}/today`,
        {
          groupId: testGroupId,
          timezone: 'Asia/Jerusalem'
        },
        { timeout: 30000 }
      );
      
      const todaySummary = todayResponse.data.data;
      console.log('   ✓ Today\'s summary retrieved:');
      console.log(`     - Messages today: ${todaySummary.totalMessages}`);
      
    } else {
      console.log('   ⚠ No groups found - ensure WhatsApp is connected');
    }
    
    console.log(`\n✅ All tests passed for ${name}`);
    
  } catch (error) {
    console.error(`\n❌ Error testing ${name}:`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
      console.error(`   Data:`, error.response.data);
    } else if (error.request) {
      console.error('   No response received - server may be down or unreachable');
      console.error(`   URL: ${error.config?.url}`);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

async function checkAIConfiguration(baseUrl) {
  console.log('\n' + '='.repeat(60));
  console.log('Checking AI Service Configuration');
  console.log('='.repeat(60));
  
  try {
    // Make a test request and check response headers or specific endpoints
    const response = await axios.get(`${baseUrl}/api/v1/health`, {
      timeout: 5000
    });
    
    console.log('✓ Backend is reachable');
    
    // Check if environment variables are set (this would need a specific endpoint)
    console.log('\nAI Service Requirements:');
    console.log('- OPENAI_API_KEY: Should be set in Render dashboard');
    console.log('- ANTHROPIC_API_KEY: Optional, for Claude AI');
    console.log('- GEMINI_API_KEY: Optional, for Google Gemini');
    console.log('\nNote: At least one AI API key must be configured for AI summaries');
    
  } catch (error) {
    console.error('❌ Could not reach backend to check configuration');
  }
}

async function main() {
  console.log('WhatsApp Summary Feature Test');
  console.log('==============================');
  console.log(`Test Date: ${TEST_DATE}`);
  console.log(`Test Group ID: ${TEST_GROUP_ID}`);
  
  // Test production first (if available)
  if (process.argv.includes('--production') || process.argv.includes('-p')) {
    await testEndpoint('Production', BACKENDS.production);
    await checkAIConfiguration(BACKENDS.production);
  }
  
  // Test local if specified
  if (process.argv.includes('--local') || process.argv.includes('-l')) {
    await testEndpoint('Local', BACKENDS.local);
    await checkAIConfiguration(BACKENDS.local);
  }
  
  // Default: test production
  if (!process.argv.includes('--production') && 
      !process.argv.includes('-p') && 
      !process.argv.includes('--local') && 
      !process.argv.includes('-l')) {
    await testEndpoint('Production', BACKENDS.production);
    await checkAIConfiguration(BACKENDS.production);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
  console.log('\nUsage:');
  console.log('  node test-whatsapp-summary-fix.js [options]');
  console.log('\nOptions:');
  console.log('  --production, -p   Test production server');
  console.log('  --local, -l        Test local server');
  console.log('\nNote: Make sure to set the actual group ID in the script');
}

// Run the tests
main().catch(console.error);
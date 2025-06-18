#!/usr/bin/env node

/**
 * Test script for sports agent with enhanced topic detection
 * This verifies that sports agents get sports content, not tech news
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.VITE_API_URL || 'http://localhost:5001/api';
const CREWAI_URL = process.env.CREWAI_SERVICE_URL || 'http://localhost:5000';

// Test credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    const { token } = response.data;
    console.log('✅ Login successful');
    return token;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('👤 User not found, creating account...');
      const registerResponse = await axios.post(`${API_URL}/auth/register`, {
        ...TEST_USER,
        name: 'Test User'
      });
      console.log('✅ Account created');
      return registerResponse.data.token;
    }
    throw error;
  }
}

async function createSportsAgent(token) {
  console.log('\n🏃 Creating sports agent...');
  
  const agentConfig = {
    name: 'Sports News Agent',
    type: 'crewai_news',
    description: 'Agent for gathering sports news and updates',
    configuration: {
      topics: ['sports', 'football', 'basketball', 'soccer'], // Explicit sports topics
      crewaiSources: {
        reddit: true,
        linkedin: true,
        telegram: false,
        news_websites: true
      },
      maxItemsPerRun: 20,
      schedule: '0 */6 * * *'
    }
  };

  const response = await axios.post(`${API_URL}/agents`, agentConfig, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('✅ Sports agent created:', response.data.name);
  return response.data;
}

async function executeAgent(token, agentId) {
  console.log('\n🚀 Executing sports agent...');
  
  try {
    const response = await axios.post(
      `${API_URL}/agents/${agentId}/execute`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ Agent execution started');
    return response.data;
  } catch (error) {
    if (error.response?.data) {
      console.error('❌ Execution failed:', error.response.data);
    }
    throw error;
  }
}

async function checkProgress(token, agentId) {
  console.log('\n📊 Checking progress...');
  
  let attempts = 0;
  const maxAttempts = 30; // 1 minute max
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `${API_URL}/agents/${agentId}/crew-progress`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const progress = response.data.progress;
      
      if (progress?.steps && progress.steps.length > 0) {
        console.log('\n📈 Progress update:');
        progress.steps.forEach((step, index) => {
          const statusEmoji = step.status === 'completed' ? '✅' : 
                            step.status === 'in_progress' ? '🔄' : '⏳';
          console.log(`  ${statusEmoji} Step ${index + 1}: [${step.agent}] ${step.step}`);
          if (step.message) {
            console.log(`     💬 ${step.message}`);
          }
        });
      }
      
      if (progress?.results) {
        console.log('\n✅ Execution completed!');
        return progress.results;
      }
      
    } catch (error) {
      console.log('⚠️ Progress check failed:', error.message);
    }
    
    await delay(2000); // Check every 2 seconds
    attempts++;
  }
  
  console.log('⏱️ Progress check timed out');
  return null;
}

async function getAgentRuns(token, agentId) {
  console.log('\n📋 Getting agent run results...');
  
  const response = await axios.get(
    `${API_URL}/agents/${agentId}/runs`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const runs = response.data;
  if (runs.length > 0) {
    const latestRun = runs[0];
    console.log(`\n📊 Latest run: ${latestRun.status}`);
    console.log(`   Started: ${new Date(latestRun.startTime).toLocaleString()}`);
    console.log(`   Items processed: ${latestRun.itemsProcessed}`);
    console.log(`   Items added: ${latestRun.itemsAdded}`);
    
    // Check logs for topics
    if (latestRun.logs && latestRun.logs.length > 0) {
      console.log('\n📝 Run logs:');
      latestRun.logs.forEach(log => {
        if (log.message.includes('topics') || log.message.includes('sports')) {
          console.log(`   [${log.level}] ${log.message}`);
          if (log.data) {
            console.log(`   📊 Data:`, JSON.stringify(log.data, null, 2));
          }
        }
      });
    }
  }
  
  return runs;
}

async function getNewsItems(token) {
  console.log('\n📰 Getting latest news items...');
  
  const response = await axios.get(
    `${API_URL}/news?limit=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  const items = response.data.items || [];
  console.log(`\nFound ${items.length} news items:`);
  
  // Analyze content for sports vs tech
  let sportsCount = 0;
  let techCount = 0;
  
  items.forEach((item, index) => {
    const titleLower = item.title.toLowerCase();
    const contentLower = (item.content || '').toLowerCase();
    const combined = titleLower + ' ' + contentLower;
    
    const isSports = /sport|football|soccer|basketball|baseball|tennis|hockey|athlete|team|game|match|player|coach|league|championship/.test(combined);
    const isTech = /tech|ai|software|startup|computer|programming|blockchain|crypto/.test(combined);
    
    if (isSports) sportsCount++;
    if (isTech) techCount++;
    
    console.log(`\n${index + 1}. ${item.title}`);
    console.log(`   Source: ${item.source} | Type: ${isSports ? '🏃 SPORTS' : isTech ? '💻 TECH' : '📰 OTHER'}`);
    console.log(`   Topics: ${item.metadata?.matchedTopic || 'N/A'}`);
    if (item.url) {
      console.log(`   URL: ${item.url}`);
    }
  });
  
  console.log('\n📊 Content Analysis:');
  console.log(`   Sports articles: ${sportsCount} (${Math.round(sportsCount/items.length*100)}%)`);
  console.log(`   Tech articles: ${techCount} (${Math.round(techCount/items.length*100)}%)`);
  console.log(`   Other articles: ${items.length - sportsCount - techCount} (${Math.round((items.length - sportsCount - techCount)/items.length*100)}%)`);
  
  return { items, sportsCount, techCount };
}

async function testSportsAgent() {
  console.log('🏃‍♂️ Sports Agent Test - Enhanced Topic Detection\n');
  console.log('This test verifies that sports agents get sports content, not tech news\n');
  
  try {
    // Step 1: Login
    const token = await login();
    
    // Step 2: Create sports agent
    const agent = await createSportsAgent(token);
    
    // Step 3: Execute agent
    await executeAgent(token, agent._id);
    
    // Step 4: Monitor progress
    await checkProgress(token, agent._id);
    
    // Step 5: Check run details
    await getAgentRuns(token, agent._id);
    
    // Step 6: Analyze results
    await delay(3000); // Give time for items to be saved
    const { sportsCount, techCount } = await getNewsItems(token);
    
    // Step 7: Verdict
    console.log('\n🏁 Test Results:');
    if (sportsCount > techCount) {
      console.log('✅ SUCCESS: Sports agent is correctly retrieving sports content!');
      console.log(`   Sports content dominates (${sportsCount} sports vs ${techCount} tech)`);
    } else if (sportsCount > 0) {
      console.log('⚠️ PARTIAL SUCCESS: Some sports content found but not dominant');
      console.log(`   Consider tweaking topic keywords or sources`);
    } else {
      console.log('❌ FAILED: No sports content found - agent is still getting tech news');
      console.log(`   Check agent configuration and topic detection logic`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testSportsAgent().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test error:', error);
  process.exit(1);
}); 
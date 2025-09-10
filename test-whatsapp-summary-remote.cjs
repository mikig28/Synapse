#!/usr/bin/env node

/**
 * Test WhatsApp Summary Feature with Remote Backend
 * This script tests the WhatsApp group summarization API endpoints
 */

const axios = require('axios');

const BACKEND_URL = 'https://synapse-backend-7lq6.onrender.com';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logJson(data, indent = 2) {
  console.log(JSON.stringify(data, null, indent));
}

async function testAvailableGroups() {
  logSection('Testing: Get Available Groups');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/whatsapp-summary/groups`);
    
    if (response.data.success) {
      log('✅ Successfully fetched groups', 'green');
      const groups = response.data.data || [];
      log(`Found ${groups.length} groups:`, 'cyan');
      
      groups.forEach((group, index) => {
        console.log(`  ${index + 1}. ${group.name || 'Unnamed'}`);
        console.log(`     ID: ${group.id}`);
        console.log(`     Messages: ${group.messageCount || 0}`);
        console.log(`     Participants: ${group.participantCount || 0}`);
        if (group.lastActivity) {
          console.log(`     Last Activity: ${new Date(group.lastActivity).toLocaleString()}`);
        }
      });
      
      return groups;
    } else {
      log('❌ Failed to fetch groups', 'red');
      console.log('Response:', response.data);
      return [];
    }
  } catch (error) {
    log('❌ Error fetching groups:', 'red');
    console.error(error.response?.data || error.message);
    return [];
  }
}

async function testGenerateSummary(groupId, groupName) {
  logSection(`Testing: Generate Summary for "${groupName}"`);
  
  const today = new Date().toISOString().split('T')[0];
  const requestData = {
    groupId: groupId,
    date: today,
    timezone: 'Asia/Jerusalem',
    options: {
      includeMedia: true,
      includeEmojis: true,
      includeKeywords: true
    }
  };
  
  log('Request payload:', 'yellow');
  logJson(requestData);
  
  try {
    log('\nSending request to generate summary...', 'cyan');
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/whatsapp-summary/generate`,
      requestData,
      {
        timeout: 30000 // 30 second timeout
      }
    );
    
    if (response.data.success) {
      log('✅ Successfully generated summary', 'green');
      const summary = response.data.data;
      
      console.log('\n--- Summary Details ---');
      console.log(`Group: ${summary.groupName}`);
      console.log(`Total Messages: ${summary.totalMessages}`);
      console.log(`Active Participants: ${summary.activeParticipants}`);
      console.log(`Time Range: ${summary.timeRange.start} to ${summary.timeRange.end}`);
      
      if (summary.overallSummary) {
        console.log('\n📝 Overall Summary:');
        console.log(summary.overallSummary);
      }
      
      if (summary.aiInsights) {
        console.log('\n🤖 AI Insights:');
        console.log(`Sentiment: ${summary.aiInsights.sentiment}`);
        
        if (summary.aiInsights.keyTopics?.length > 0) {
          console.log('\nKey Topics:');
          summary.aiInsights.keyTopics.forEach(topic => {
            console.log(`  • ${topic}`);
          });
        }
        
        if (summary.aiInsights.actionItems?.length > 0) {
          console.log('\nAction Items:');
          summary.aiInsights.actionItems.forEach(item => {
            console.log(`  ✓ ${item}`);
          });
        }
        
        if (summary.aiInsights.importantEvents?.length > 0) {
          console.log('\nImportant Events:');
          summary.aiInsights.importantEvents.forEach(event => {
            console.log(`  ⚡ ${event}`);
          });
        }
      }
      
      if (summary.senderInsights?.length > 0) {
        console.log('\n👥 Top Contributors:');
        summary.senderInsights.slice(0, 3).forEach(sender => {
          console.log(`  ${sender.name}: ${sender.messageCount} messages`);
          if (sender.summary) {
            console.log(`    Summary: ${sender.summary}`);
          }
        });
      }
      
      if (summary.topKeywords?.length > 0) {
        console.log('\n🏷️ Top Keywords:');
        summary.topKeywords.slice(0, 5).forEach(kw => {
          console.log(`  "${kw.keyword}" (${kw.frequency} times)`);
        });
      }
      
      return summary;
    } else {
      log('❌ Failed to generate summary', 'red');
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    log('❌ Error generating summary:', 'red');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Request timeout or network error.');
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function testGetMessages(groupId, groupName) {
  logSection(`Testing: Get Messages for "${groupName}"`);
  
  const params = {
    groupId: groupId,
    page: 1,
    limit: 10
  };
  
  log('Request parameters:', 'yellow');
  logJson(params);
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/whatsapp-summary/groups/${groupId}/messages`, {
      params: params
    });
    
    if (response.data.success) {
      log('✅ Successfully fetched messages', 'green');
      const { data, pagination, groupInfo } = response.data;
      
      console.log('\n--- Messages Info ---');
      console.log(`Group: ${groupInfo.name}`);
      console.log(`Total Messages: ${pagination.total}`);
      console.log(`Page ${pagination.page} of ${Math.ceil(pagination.total / pagination.limit)}`);
      
      if (data && data.length > 0) {
        console.log('\n--- Sample Messages ---');
        data.slice(0, 5).forEach((msg, index) => {
          console.log(`\n${index + 1}. ${msg.senderName} (${msg.senderPhone})`);
          console.log(`   Time: ${new Date(msg.timestamp).toLocaleString()}`);
          console.log(`   Type: ${msg.type}`);
          if (msg.message) {
            console.log(`   Message: ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}`);
          }
        });
      } else {
        log('No messages found', 'yellow');
      }
      
      return response.data;
    } else {
      log('❌ Failed to fetch messages', 'red');
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    log('❌ Error fetching messages:', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function runAllTests() {
  logSection('WhatsApp Summary Feature Test Suite');
  log('Backend URL: ' + BACKEND_URL, 'cyan');
  
  // Test 1: Get available groups
  const groups = await testAvailableGroups();
  
  if (groups.length === 0) {
    log('\n⚠️  No groups found. Please ensure WhatsApp is connected and has groups.', 'yellow');
    return;
  }
  
  // Test 2: Generate summary for the first group with messages
  const groupWithMessages = groups.find(g => g.messageCount > 0) || groups[0];
  
  if (groupWithMessages) {
    log(`\n📊 Testing with group: ${groupWithMessages.name}`, 'magenta');
    
    // Test messages endpoint
    await testGetMessages(groupWithMessages.id, groupWithMessages.name);
    
    // Test summary generation
    const summary = await testGenerateSummary(groupWithMessages.id, groupWithMessages.name);
    
    if (summary) {
      if (summary.totalMessages === 0) {
        log('\n⚠️  Summary generated but shows 0 messages!', 'yellow');
        log('This indicates the query issue needs to be fixed.', 'yellow');
        
        console.log('\n--- Debugging Info ---');
        console.log('Group ID used:', groupWithMessages.id);
        console.log('Group Name:', groupWithMessages.name);
        console.log('Expected messages:', groupWithMessages.messageCount);
        console.log('Actual messages in summary:', summary.totalMessages);
        
        log('\n🔧 Suggested Fix:', 'cyan');
        console.log('1. Check if messages have createdAt field populated');
        console.log('2. Verify the date range in the query');
        console.log('3. Ensure metadata.isGroup is set correctly');
        console.log('4. Check if metadata.groupId matches the provided groupId');
      } else {
        log('\n✅ Summary generated successfully with messages!', 'green');
      }
    }
  } else {
    log('\n⚠️  No groups with messages found', 'yellow');
  }
  
  logSection('Test Suite Completed');
}

// Run the tests
runAllTests().catch(error => {
  log('Fatal error running tests:', 'red');
  console.error(error);
  process.exit(1);
});
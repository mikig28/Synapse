const axios = require('axios');

// Test script for multi-user Telegram bot functionality
async function testMultiUserTelegramBots() {
  console.log('🧪 Testing Multi-User Telegram Bot System');
  console.log('=========================================');
  
  const baseURL = 'http://localhost:3000/api/v1';
  
  // Test data - replace with actual test credentials
  const testUsers = [
    {
      email: 'user1@example.com',
      password: 'password123',
      botToken: 'TEST_BOT_TOKEN_1', // Replace with actual bot token
      chatId: -123456789 // Replace with actual chat ID
    },
    {
      email: 'user2@example.com', 
      password: 'password123',
      botToken: 'TEST_BOT_TOKEN_2', // Replace with actual bot token
      chatId: -987654321 // Replace with actual chat ID
    }
  ];
  
  try {
    console.log('📝 Step 1: Testing bot token validation...');
    
    // Test 1: Validate bot tokens
    for (const user of testUsers) {
      try {
        // Login first to get JWT token
        const loginResponse = await axios.post(`${baseURL}/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        const jwt = loginResponse.data.token;
        
        // Validate bot token
        const validateResponse = await axios.post(
          `${baseURL}/users/me/telegram-bot/validate`,
          { botToken: user.botToken },
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        
        console.log(`✅ ${user.email}: Bot token validation - ${validateResponse.data.valid ? 'VALID' : 'INVALID'}`);
        if (validateResponse.data.valid) {
          console.log(`   Bot: @${validateResponse.data.botInfo.username}`);
        }
        
      } catch (error) {
        console.log(`❌ ${user.email}: Bot token validation failed - ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n🔧 Step 2: Testing bot token setup...');
    
    // Test 2: Set bot tokens for each user
    for (const user of testUsers) {
      try {
        // Login first
        const loginResponse = await axios.post(`${baseURL}/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        const jwt = loginResponse.data.token;
        
        // Set bot token
        const setBotResponse = await axios.post(
          `${baseURL}/users/me/telegram-bot`,
          { botToken: user.botToken },
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        
        console.log(`✅ ${user.email}: Bot token set successfully`);
        console.log(`   Bot: @${setBotResponse.data.botInfo.username}`);
        
        // Add monitored chat
        const addChatResponse = await axios.post(
          `${baseURL}/users/me/telegram-chats`,
          { chatId: user.chatId },
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        
        console.log(`✅ ${user.email}: Chat ${user.chatId} added to monitoring`);
        
      } catch (error) {
        console.log(`❌ ${user.email}: Setup failed - ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n📊 Step 3: Testing bot status retrieval...');
    
    // Test 3: Get bot status for each user
    for (const user of testUsers) {
      try {
        // Login first
        const loginResponse = await axios.post(`${baseURL}/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        const jwt = loginResponse.data.token;
        
        // Get bot status
        const statusResponse = await axios.get(
          `${baseURL}/users/me/telegram-bot`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        
        const status = statusResponse.data;
        console.log(`📋 ${user.email} Bot Status:`);
        console.log(`   Has Bot: ${status.hasBot}`);
        console.log(`   Is Active: ${status.isActive}`);
        console.log(`   Bot Username: @${status.botUsername}`);
        console.log(`   Monitored Chats: ${status.monitoredChats}`);
        
      } catch (error) {
        console.log(`❌ ${user.email}: Status retrieval failed - ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n🧪 Step 4: Testing bot isolation...');
    console.log('💡 Send messages to each user\'s monitored chats to verify isolation');
    console.log('   Each user should only receive messages from their own bot');
    console.log('   Messages sent to User 1\'s chat should NOT appear in User 2\'s system');
    
    console.log('\n✅ Multi-user Telegram bot test completed!');
    console.log('🔍 Check the server logs to verify bot instances are properly isolated');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions for manual testing
console.log(`
🔧 SETUP INSTRUCTIONS:
=====================
1. Create two Telegram bots via @BotFather:
   - /newbot -> Choose names and get tokens
   - Copy the tokens to replace TEST_BOT_TOKEN_1 and TEST_BOT_TOKEN_2

2. Create test groups/chats and get their IDs:
   - Add both bots to separate groups
   - Get chat IDs (negative numbers for groups)
   - Replace the chatId values in testUsers array

3. Create test user accounts or use existing ones:
   - Update email/password in testUsers array

4. Start the server:
   - npm run dev (or your start command)

5. Run this test:
   - node test-multi-user-telegram.js

6. Manual verification:
   - Send messages in User 1's group -> should appear in User 1's system only
   - Send messages in User 2's group -> should appear in User 2's system only
   - Check server logs for proper bot isolation

Expected behavior:
✅ Each user has their own bot instance
✅ Messages are properly routed to the correct user  
✅ No cross-contamination between users
✅ Bot tokens are securely stored and validated
`);

// Uncomment to run the test
// testMultiUserTelegramBots();
import axios from 'axios';

const BASE_URL = 'https://synapse-backend.onrender.com';

async function testTelegramChannelsAPI() {
  try {
    console.log('🔄 Testing Telegram Channels API...');

    // Test 1: Check health
    console.log('\n1. Testing backend health...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
      console.log('✅ Backend is healthy:', healthResponse.data);
    } catch (error) {
      console.log('❌ Backend health check failed:', error.message);
      return;
    }

    // Test 2: Try to get channels without auth (should fail)
    console.log('\n2. Testing unauthorized channel access...');
    try {
      const unauthorizedResponse = await axios.get(`${BASE_URL}/api/v1/telegram-channels`, { timeout: 10000 });
      console.log('❌ Unauthorized access should have failed but succeeded:', unauthorizedResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Unauthorized access properly blocked');
      } else {
        console.log('❌ Unexpected error on unauthorized access:', error.message);
      }
    }

    // Test 3: Check user bot endpoints
    console.log('\n3. Testing user bot endpoints (should require auth)...');
    try {
      const botStatusResponse = await axios.get(`${BASE_URL}/api/v1/users/me/telegram-bot`, { timeout: 10000 });
      console.log('❌ Bot status access should have failed but succeeded:', botStatusResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Bot status endpoint properly requires authentication');
      } else {
        console.log('❌ Unexpected error on bot status:', error.message);
      }
    }

    console.log('\n📊 API Test Summary:');
    console.log('- Backend is accessible');
    console.log('- Authentication is required (as expected)');
    console.log('- The issue is likely that users need to configure their Telegram bot tokens');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTelegramChannelsAPI();
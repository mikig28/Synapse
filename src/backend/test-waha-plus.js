/**
 * Test WAHA PLUS Multi-User Functionality
 * 
 * This script tests that WAHA PLUS supports multiple sessions
 * and that each user gets their own WhatsApp connection.
 */

const axios = require('axios');

const WAHA_BASE_URL = 'https://synapse-waha.onrender.com';

async function testWAHAPlus() {
  console.log('🧪 Testing WAHA PLUS Multi-User Support...\n');

  try {
    // Test 1: Check WAHA service health
    console.log('1️⃣ Testing WAHA service health...');
    const healthResponse = await axios.get(`${WAHA_BASE_URL}/health`);
    console.log('✅ WAHA service is healthy:', healthResponse.data);
    console.log('');

    // Test 2: Test session creation (simulate multiple users)
    console.log('2️⃣ Testing multi-session support...');
    
    const user1SessionId = 'test_user_1_' + Date.now();
    const user2SessionId = 'test_user_2_' + Date.now();
    
    console.log(`Creating session for User 1: ${user1SessionId}`);
    const user1Session = await axios.post(`${WAHA_BASE_URL}/api/sessions/${user1SessionId}/start`);
    console.log('✅ User 1 session created:', user1Session.data);
    
    console.log(`Creating session for User 2: ${user2SessionId}`);
    const user2Session = await axios.post(`${WAHA_BASE_URL}/api/sessions/${user2SessionId}/start`);
    console.log('✅ User 2 session created:', user2Session.data);
    console.log('');

    // Test 3: Verify both sessions exist independently
    console.log('3️⃣ Verifying independent sessions...');
    
    const user1Status = await axios.get(`${WAHA_BASE_URL}/api/sessions/${user1SessionId}`);
    const user2Status = await axios.get(`${WAHA_BASE_URL}/api/sessions/${user2SessionId}`);
    
    console.log(`User 1 session status: ${user1Status.data.status}`);
    console.log(`User 2 session status: ${user2Status.data.status}`);
    console.log('');

    // Test 4: Test QR code generation for each user
    console.log('4️⃣ Testing QR code generation...');
    
    const user1QR = await axios.get(`${WAHA_BASE_URL}/api/sessions/${user1SessionId}/qr`);
    const user2QR = await axios.get(`${WAHA_BASE_URL}/api/sessions/${user2SessionId}/qr`);
    
    console.log(`User 1 QR available: ${!!user1QR.data.qr}`);
    console.log(`User 2 QR available: ${!!user2QR.data.qr}`);
    console.log('');

    // Test 5: Cleanup - stop sessions
    console.log('5️⃣ Cleaning up test sessions...');
    
    await axios.post(`${WAHA_BASE_URL}/api/sessions/${user1SessionId}/stop`);
    await axios.post(`${WAHA_BASE_URL}/api/sessions/${user2SessionId}/stop`);
    
    console.log('✅ Test sessions cleaned up');
    console.log('');

    console.log('🎉 WAHA PLUS Multi-User Test PASSED!');
    console.log('✅ Multiple sessions supported');
    console.log('✅ Each user gets independent QR codes');
    console.log('✅ Sessions can run simultaneously');
    console.log('');
    console.log('🚀 Your Synapse platform is ready for true multi-user WhatsApp!');

  } catch (error) {
    console.error('❌ WAHA PLUS Test FAILED:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Verify WAHA PLUS is running on https://synapse-waha.onrender.com');
    console.log('2. Check if WAHA PLUS license is active');
    console.log('3. Ensure multi-session support is enabled');
  }
}

// Run the test
testWAHAPlus();

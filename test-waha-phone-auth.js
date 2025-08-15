const axios = require('axios');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';
const TOKEN = process.env.AUTH_TOKEN || 'your-auth-token';

async function testWAHAPhoneAuth() {
  console.log('🧪 Testing WAHA Phone Authentication\n');
  
  try {
    // Step 1: Check current status
    console.log('1. Checking WhatsApp/WAHA status...');
    try {
      const statusResponse = await axios.get(`${API_BASE}/whatsapp/status`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      console.log('Status:', statusResponse.data);
      console.log('Service Type:', statusResponse.data.serviceType || 'unknown');
    } catch (error) {
      console.error('Status check failed:', error.response?.data || error.message);
    }

    // Step 2: Try phone authentication
    const phoneNumber = process.argv[2] || '+1234567890';
    console.log(`\n2. Requesting phone auth code for: ${phoneNumber}`);
    
    try {
      const phoneAuthResponse = await axios.post(`${API_BASE}/whatsapp/auth/phone`, {
        phoneNumber: phoneNumber
      }, {
        headers: { 
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('\nPhone Auth Response:');
      console.log(JSON.stringify(phoneAuthResponse.data, null, 2));
      
      if (phoneAuthResponse.data.success && phoneAuthResponse.data.data?.pairingCode) {
        console.log('\n✅ Got pairing code:', phoneAuthResponse.data.data.pairingCode);
      }
      
    } catch (error) {
      console.error('\n❌ Phone auth request failed:');
      console.error('Status:', error.response?.status);
      console.error('Error:', error.response?.data || error.message);
      
      // Check if it's the expected "not supported" error
      if (error.response?.data?.code === 'PHONE_AUTH_NOT_SUPPORTED') {
        console.log('\n📋 Instructions from server:');
        if (error.response.data.instructions) {
          error.response.data.instructions.forEach(instruction => {
            console.log(`   ${instruction}`);
          });
        }
      }
    }

    // Step 3: Check if we should try WAHA directly
    console.log('\n3. Checking if WAHA service is accessible...');
    const WAHA_URL = 'https://synapse-waha.onrender.com';
    
    try {
      const wahaHealthResponse = await axios.get(`${WAHA_URL}/health`, {
        timeout: 5000
      });
      console.log('WAHA Health:', wahaHealthResponse.data);
    } catch (error) {
      console.error('WAHA service not accessible:', error.message);
      console.log('\n⚠️  The WAHA service at', WAHA_URL, 'is not responding.');
      console.log('This could mean:');
      console.log('1. The service is down or not deployed');
      console.log('2. You need to run WAHA locally');
      console.log('3. The URL needs to be updated in your .env file');
    }

    // Step 4: Provide solution
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 SOLUTION: What to do next');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nOption 1: Use QR Code (Recommended - Works Now)');
    console.log('   Run: node test-whatsapp-qr.js');
    console.log('\nOption 2: Set up WAHA locally for phone pairing');
    console.log('   1. Install Docker');
    console.log('   2. Run: docker run -it -p 3000:3000 devlikeapro/waha');
    console.log('   3. Update .env: WAHA_SERVICE_URL=http://localhost:3000');
    console.log('   4. Restart your backend');
    console.log('\nOption 3: Use WhatsApp Business API (Official)');
    console.log('   - Requires business verification');
    console.log('   - Has costs associated');
    console.log('   - Supports phone pairing natively');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
console.log('WAHA Phone Authentication Debug Test');
console.log('=====================================\n');
testWAHAPhoneAuth();
const axios = require('axios');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';
const TOKEN = process.env.AUTH_TOKEN || 'your-auth-token';

async function testWhatsAppPairing() {
  console.log('🧪 Testing WhatsApp Phone Pairing...\n');

  try {
    // Get phone number from command line or use default
    const phoneNumber = process.argv[2] || '+1234567890';
    
    console.log(`📱 Requesting pairing code for: ${phoneNumber}`);
    
    // Step 1: Request pairing code
    const pairingResponse = await axios.post(`${API_BASE}/whatsapp/auth/phone`, {
      phoneNumber: phoneNumber
    }, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    if (pairingResponse.data.success && pairingResponse.data.data.pairingCode) {
      console.log('\n✅ Pairing code generated successfully!');
      console.log('━'.repeat(50));
      console.log(`📱 PAIRING CODE: ${pairingResponse.data.data.pairingCode}`);
      console.log('━'.repeat(50));
      console.log('\n📲 Instructions:');
      console.log('1. Open WhatsApp on your phone');
      console.log('2. Go to Settings > Linked Devices');
      console.log('3. Tap "Link a Device"');
      console.log('4. Select "Link with phone number"');
      console.log('5. Enter the 8-digit code shown above');
      console.log('\n⏳ Waiting for pairing to complete...');
      
      // Step 2: Poll for verification status
      let paired = false;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes timeout
      
      while (!paired && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        try {
          const verifyResponse = await axios.post(`${API_BASE}/whatsapp/auth/verify`, {
            phoneNumber: phoneNumber,
            code: pairingResponse.data.data.pairingCode
          }, {
            headers: { Authorization: `Bearer ${TOKEN}` }
          });
          
          if (verifyResponse.data.success) {
            paired = true;
            console.log('\n✅ Phone pairing successful! WhatsApp is now connected.');
            
            // Check connection status
            const statusResponse = await axios.get(`${API_BASE}/whatsapp/status`, {
              headers: { Authorization: `Bearer ${TOKEN}` }
            });
            
            console.log('\n📊 Connection Status:');
            console.log(`   Connected: ${statusResponse.data.connected}`);
            console.log(`   Authenticated: ${statusResponse.data.authenticated}`);
            console.log(`   Phone: ${phoneNumber}`);
          } else {
            console.log(`\n⏳ Still waiting... (${attempts + 1}/${maxAttempts})`);
          }
        } catch (error) {
          // Verification not complete yet
          if (error.response?.status !== 400) {
            console.error('Error checking verification:', error.response?.data || error.message);
          }
        }
        
        attempts++;
      }
      
      if (!paired) {
        console.log('\n❌ Pairing timeout. Please try again.');
      }
      
    } else {
      console.error('❌ Failed to generate pairing code:', pairingResponse.data);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data?.code === 'PHONE_AUTH_NOT_SUPPORTED') {
      console.log('\n💡 Phone pairing is not supported. Please use QR code authentication instead.');
      console.log('   Run: node test-whatsapp-fix.js');
    }
  }
}

// Run the test
console.log('WhatsApp Phone Pairing Test');
console.log('Usage: node test-whatsapp-pairing.js [phoneNumber]');
console.log('Example: node test-whatsapp-pairing.js +1234567890\n');

testWhatsAppPairing();
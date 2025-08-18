const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';
const TOKEN = process.env.AUTH_TOKEN || 'your-auth-token';

async function testWhatsAppQRAuth() {
  console.log('🔄 WhatsApp QR Code Authentication Test\n');
  console.log('ℹ️  IMPORTANT: Phone number pairing is NOT supported by Baileys!');
  console.log('ℹ️  You must use QR code scanning instead.\n');

  try {
    // Step 1: Get QR Code
    console.log('1. Requesting QR code...');
    const qrResponse = await axios.get(`${API_BASE}/whatsapp/qr`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    if (qrResponse.data.success && qrResponse.data.data) {
      console.log('✅ QR code received!\n');
      
      // Save QR code to file for easy viewing
      if (qrResponse.data.data.qr) {
        const base64Data = qrResponse.data.data.qr.replace(/^data:image\/png;base64,/, '');
        const qrPath = path.join(__dirname, 'whatsapp-qr.png');
        fs.writeFileSync(qrPath, base64Data, 'base64');
        console.log(`📱 QR code saved to: ${qrPath}`);
        console.log('   Open this file to see the QR code\n');
      }
      
      console.log('📲 Instructions to connect WhatsApp:');
      console.log('━'.repeat(50));
      console.log('1. Open WhatsApp on your phone');
      console.log('2. Go to Settings → Linked Devices');
      console.log('3. Tap "Link a Device"');
      console.log('4. ⚠️  DO NOT tap "Link with phone number" ⚠️');
      console.log('5. Scan the QR code saved in whatsapp-qr.png');
      console.log('━'.repeat(50));
      console.log('\n⏳ Waiting for you to scan the QR code...\n');
      
      // Step 2: Poll for connection status
      let connected = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes timeout
      
      while (!connected && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
          const statusResponse = await axios.get(`${API_BASE}/whatsapp/status`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
          });
          
          if (statusResponse.data.connected) {
            connected = true;
            console.log('\n✅ WhatsApp connected successfully!');
            console.log('📊 Connection Details:');
            console.log(`   Connected: ${statusResponse.data.connected}`);
            console.log(`   Authenticated: ${statusResponse.data.authenticated}`);
            console.log(`   Ready: ${statusResponse.data.isReady}`);
            
            // Clean up QR file
            try {
              fs.unlinkSync(path.join(__dirname, 'whatsapp-qr.png'));
              console.log('\n🧹 QR code file cleaned up');
            } catch (e) {
              // Ignore cleanup errors
            }
          } else {
            process.stdout.write(`\r⏳ Still waiting... (${attempts + 1}/${maxAttempts})`);
          }
        } catch (error) {
          // Continue polling
        }
        
        attempts++;
      }
      
      if (!connected) {
        console.log('\n\n❌ Connection timeout. QR code may have expired.');
        console.log('💡 Run this script again to get a new QR code.');
      }
      
    } else {
      console.error('❌ Failed to get QR code:', qrResponse.data);
    }
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already authenticated')) {
      console.log('ℹ️  WhatsApp is already connected!');
      console.log('   To reconnect, first clear the auth:');
      console.log('   POST /api/v1/whatsapp/clear-auth');
    } else {
      console.error('\n❌ Error:', error.response?.data || error.message);
    }
  }
}

console.log('WhatsApp QR Code Authentication Test');
console.log('====================================\n');
console.log('⚠️  IMPORTANT: The "Link with phone number" feature');
console.log('   does NOT work with this platform!\n');
console.log('✅ Use QR code scanning instead (this script will help)\n');

// Run the test
testWhatsAppQRAuth();
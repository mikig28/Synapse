const axios = require('axios');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';
const TOKEN = process.env.AUTH_TOKEN || 'your-auth-token';

async function testWhatsAppFixes() {
  console.log('🧪 Testing WhatsApp Chat Fetching Fixes...\n');

  try {
    // Check current status
    console.log('1. Checking WhatsApp status...');
    const statusResponse = await axios.get(`${API_BASE}/whatsapp/status`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log('Status:', statusResponse.data);

    if (!statusResponse.data.isReady) {
      console.log('⚠️  WhatsApp not ready. Please scan QR code first.');
      return;
    }

    // Force history sync
    console.log('\n2. Forcing history sync...');
    const syncResponse = await axios.post(`${API_BASE}/whatsapp/force-history-sync`, {}, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log('Sync response:', syncResponse.data);

    // Wait a bit for sync to process
    console.log('\n3. Waiting 10 seconds for sync to process...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check groups
    console.log('\n4. Checking groups...');
    const groupsResponse = await axios.get(`${API_BASE}/whatsapp/groups`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log(`Found ${groupsResponse.data.data?.length || 0} groups:`);
    if (groupsResponse.data.data?.length > 0) {
      groupsResponse.data.data.slice(0, 3).forEach((group, index) => {
        console.log(`  ${index + 1}. ${group.name} (${group.participantCount} members)`);
      });
    }

    // Check private chats
    console.log('\n5. Checking private chats...');
    const chatsResponse = await axios.get(`${API_BASE}/whatsapp/private-chats`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log(`Found ${chatsResponse.data.data?.length || 0} private chats:`);
    if (chatsResponse.data.data?.length > 0) {
      chatsResponse.data.data.slice(0, 3).forEach((chat, index) => {
        console.log(`  ${index + 1}. ${chat.name}`);
      });
    }

    // Force refresh
    console.log('\n6. Force refreshing chats...');
    const refreshResponse = await axios.post(`${API_BASE}/whatsapp/refresh-chats`, {}, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    
    console.log('Refresh response:', refreshResponse.data);

    console.log('\n✅ Test completed. Check the backend logs for detailed information about chat discovery.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testWhatsAppFixes(); 
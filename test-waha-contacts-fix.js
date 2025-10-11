const axios = require('axios');

// Test the WAHA Plus contacts endpoint
async function testWAHAContacts() {
  try {
    console.log('🧪 Testing WAHA Plus contacts endpoint...');
    
    // Test the official WAHA Plus contacts endpoint
    const response = await axios.get('http://localhost:3001/api/waha/contacts', {
      headers: {
        'Authorization': 'Bearer test-token' // Replace with actual token
      }
    });
    
    console.log('✅ Contacts endpoint response:', {
      success: response.data.success,
      count: response.data.meta?.count || 0,
      sampleContact: response.data.data?.[0] || null
    });
    
    if (response.data.data && response.data.data.length > 0) {
      const sampleContact = response.data.data[0];
      console.log('📋 Sample contact structure:', {
        id: sampleContact.id,
        name: sampleContact.name,
        pushname: sampleContact.pushname,
        shortName: sampleContact.shortName,
        number: sampleContact.number
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing contacts endpoint:', error.response?.data || error.message);
  }
}

// Test the chats endpoint to see if names are resolved
async function testWAHAChats() {
  try {
    console.log('\n🧪 Testing WAHA Plus chats endpoint...');
    
    const response = await axios.get('http://localhost:3001/api/waha/chats', {
      headers: {
        'Authorization': 'Bearer test-token' // Replace with actual token
      }
    });
    
    console.log('✅ Chats endpoint response:', {
      success: response.data.success,
      count: response.data.data?.length || 0
    });
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('📋 Sample chats with resolved names:');
      response.data.data.slice(0, 3).forEach((chat, index) => {
        console.log(`  ${index + 1}. ${chat.name} (${chat.isGroup ? 'Group' : 'Private'}) - ID: ${chat.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing chats endpoint:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting WAHA Plus contacts fix verification...\n');
  
  await testWAHAContacts();
  await testWAHAChats();
  
  console.log('\n✨ Test completed! Check the logs above to verify contact names are being resolved correctly.');
}

runTests().catch(console.error);

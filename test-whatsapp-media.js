/**
 * Test WhatsApp Media Download Functionality
 *
 * This script tests the new WhatsApp media download feature.
 * Run this after implementing the media download functionality.
 */

const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1/waha`;

// Sample webhook payload that would be sent by WAHA
const sampleMediaMessage = {
  event: "message",
  session: "default",
  id: "test_webhook_123",
  timestamp: Date.now(),
  payload: {
    id: "true_11111111111@c.us_testmessage123",
    timestamp: Date.now(),
    body: "Check out this image!",
    from: "11111111111@c.us",
    hasMedia: true,
    media: {
      url: "https://example.com/sample-image.jpg", // Replace with actual test URL
      mimetype: "image/jpeg",
      filename: null,
      error: null
    }
  }
};

async function testWebhookHandling() {
  console.log('🧪 Testing WhatsApp Media Webhook Handling...\n');

  try {
    console.log('1. Sending test media message to webhook...');
    const webhookResponse = await axios.post(`${API_BASE}/webhook`, sampleMediaMessage, {
      timeout: 10000
    });

    console.log('✅ Webhook response:', webhookResponse.data);

    if (webhookResponse.data.success !== false) {
      console.log('✅ Webhook processed successfully');
    }

  } catch (error) {
    console.log('⚠️ Webhook test failed (expected if WAHA service is not running):', error.message);
  }
}

async function testMediaStats() {
  console.log('\n2. Testing media statistics endpoint...');

  try {
    const statsResponse = await axios.get(`${API_BASE}/media-stats`);
    console.log('✅ Media stats:', JSON.stringify(statsResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Media stats test failed:', error.message);
  }
}

async function testMediaFileAccess() {
  console.log('\n3. Testing media file access endpoint...');

  try {
    // This will fail if no actual media file exists, but tests the endpoint
    const mediaResponse = await axios.get(`${API_BASE}/media/testmessage123`, {
      responseType: 'stream'
    });
    console.log('✅ Media file access successful');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('⚠️ Media file not found (expected - no test file exists)');
    } else {
      console.log('❌ Media file access test failed:', error.message);
    }
  }
}

async function checkEnvironment() {
  console.log('4. Checking environment configuration...\n');

  const requiredEnvVars = [
    'BACKEND_URL',
    'WAHA_SERVICE_URL',
    'WHATSAPP_MEDIA_DIR'
  ];

  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${value}`);
    } else {
      console.log(`⚠️ ${envVar}: Not set`);
    }
  });
}

async function runTests() {
  console.log('🚀 Starting WhatsApp Media Download Tests\n');
  console.log('=' .repeat(50));

  await checkEnvironment();
  await testWebhookHandling();
  await testMediaStats();
  await testMediaFileAccess();

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Send a real media message to your WhatsApp number');
  console.log('2. Check the webhook logs for media processing');
  console.log('3. Verify files are downloaded to the storage directory');
  console.log('4. Use the media endpoints to access downloaded files');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testWebhookHandling, testMediaStats, testMediaFileAccess };

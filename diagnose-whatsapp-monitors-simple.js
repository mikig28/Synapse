/**
 * WhatsApp Monitor Diagnostic Script (Simplified)
 * Uses direct MongoDB queries to avoid TypeScript model imports
 *
 * Usage: node diagnose-whatsapp-monitors-simple.js
 */

import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
const WAHA_SERVICE_URL = process.env.WAHA_SERVICE_URL || 'https://synapse-waha.onrender.com';
const WAHA_API_KEY = process.env.WAHA_API_KEY || 'waha-synapse-2025-secure';
const BACKEND_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function main() {
  console.log('🔍 ========== WhatsApp Monitor Diagnostics ==========\n');

  // Step 1: Check MongoDB Connection
  console.log('📊 Step 1: Checking MongoDB Connection...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }

  // Step 2: Check Group Monitors (using direct MongoDB queries)
  console.log('📊 Step 2: Checking Group Monitors...');
  try {
    const db = mongoose.connection.db;
    const monitors = await db.collection('groupmonitors').find({}).toArray();
    const users = await db.collection('users').find({}).toArray();

    // Create user lookup map
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    console.log(`Found ${monitors.length} group monitor(s):\n`);

    if (monitors.length === 0) {
      console.log('⚠️  NO MONITORS FOUND! You need to create monitors first.');
      console.log('   Go to your frontend and create a group monitor.\n');
    } else {
      monitors.forEach((monitor, index) => {
        const user = userMap.get(monitor.userId?.toString());
        console.log(`Monitor #${index + 1}:`);
        console.log(`  📱 Group: ${monitor.groupName} (${monitor.groupId})`);
        console.log(`  👤 User: ${user?.email || user?.name || monitor.userId}`);
        console.log(`  🔘 Active: ${monitor.isActive ? '✅ YES' : '❌ NO'}`);
        console.log(`  ⚙️  Settings:`);
        console.log(`     - Save All Images: ${monitor.settings?.saveAllImages ? '✅ ON' : '❌ OFF'}`);
        console.log(`     - Capture Social Links: ${monitor.settings?.captureSocialLinks ? '✅ ON' : '❌ OFF'}`);
        console.log(`     - Process Voice Notes: ${monitor.settings?.processVoiceNotes ? '✅ ON' : '❌ OFF'}`);
        console.log(`     - Send Feedback Messages: ${monitor.settings?.sendFeedbackMessages ? '✅ ON' : '❌ OFF'}`);
        console.log(`  📈 Statistics:`);
        console.log(`     - Total Messages: ${monitor.statistics?.totalMessages || 0}`);
        console.log(`     - Images Processed: ${monitor.statistics?.imagesProcessed || 0}`);
        console.log(`     - Persons Detected: ${monitor.statistics?.personsDetected || 0}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error checking monitors:', error.message);
  }

  // Step 3: Check WAHA Session
  console.log('\n📊 Step 3: Checking WAHA Session Status...');
  try {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();

    if (users.length === 0) {
      console.log('⚠️  No users found in database\n');
    } else {
      for (const user of users) {
        const sessionName = `u_${user._id.toString().substring(0, 12)}`;
        console.log(`\nChecking session for user: ${user.email || user.name || user._id}`);
        console.log(`Session name: ${sessionName}`);

        try {
          const response = await axios.get(
            `${WAHA_SERVICE_URL}/api/sessions/${sessionName}`,
            {
              headers: { 'X-Api-Key': WAHA_API_KEY },
              timeout: 10000
            }
          );

          const session = response.data;
          console.log(`  🔘 Status: ${session.status === 'WORKING' ? '✅ WORKING' : '❌ ' + session.status}`);
          console.log(`  📱 Engine: ${session.engine?.engine || 'Unknown'}`);
          console.log(`  📞 Phone: ${session.me?.id || 'Not connected'}`);
          console.log(`  🔧 Webhooks configured: ${session.config?.webhooks?.length || 0}`);

          if (session.config?.webhooks) {
            session.config.webhooks.forEach((webhook, idx) => {
              console.log(`     Webhook #${idx + 1}:`);
              console.log(`       URL: ${webhook.url}`);
              console.log(`       Events: ${webhook.events.join(', ')}`);
            });
          }
        } catch (wahaError) {
          if (wahaError.code === 'ECONNABORTED') {
            console.log(`  ❌ WAHA service timeout - service may be slow or down`);
          } else if (wahaError.response?.status === 404) {
            console.log(`  ⚠️  Session not found - needs to be created`);
          } else {
            console.log(`  ❌ Error: ${wahaError.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking WAHA session:', error.message);
  }

  // Step 4: Test Webhook Endpoint
  console.log('\n📊 Step 4: Testing Backend Webhook Endpoint...');
  try {
    const testPayload = {
      event: 'message',
      session: 'test_session',
      payload: {
        id: 'test_message_id',
        chatId: '123456789@g.us',
        from: '987654321@c.us',
        body: 'Test message',
        timestamp: Date.now()
      }
    };

    console.log(`Sending test webhook to: ${BACKEND_URL}/api/v1/waha/webhook`);

    const response = await axios.post(
      `${BACKEND_URL}/api/v1/waha/webhook`,
      testPayload,
      { timeout: 5000 }
    );

    console.log('✅ Webhook endpoint is reachable');
    console.log(`   Response status: ${response.status}`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is not running!');
      console.log('   Start it with: npm run dev:backend');
    } else if (error.code === 'ECONNABORTED') {
      console.log('⚠️  Backend webhook timeout - server may be slow');
    } else {
      console.log(`⚠️  Webhook endpoint error: ${error.message}`);
    }
  }

  // Step 5: Recommendations
  console.log('\n📊 Step 5: Recommendations\n');

  try {
    const db = mongoose.connection.db;
    const monitors = await db.collection('groupmonitors').find({}).toArray();

    const issues = [];

    if (monitors.length === 0) {
      issues.push('❌ No group monitors configured. Create monitors via the frontend.');
    }

    const inactiveMonitors = monitors.filter(m => !m.isActive);
    if (inactiveMonitors.length > 0) {
      issues.push(`⚠️  ${inactiveMonitors.length} monitor(s) are INACTIVE. Enable them in settings.`);
    }

    const noVoiceProcessing = monitors.filter(m => m.isActive && !m.settings?.processVoiceNotes);
    if (noVoiceProcessing.length > 0) {
      issues.push(`⚠️  ${noVoiceProcessing.length} active monitor(s) have Voice Processing DISABLED.`);
    }

    const noBookmarks = monitors.filter(m => m.isActive && !m.settings?.captureSocialLinks);
    if (noBookmarks.length > 0) {
      issues.push(`⚠️  ${noBookmarks.length} active monitor(s) have Auto-Bookmark DISABLED.`);
    }

    const noFeedback = monitors.filter(m => m.isActive && !m.settings?.sendFeedbackMessages);
    if (noFeedback.length > 0) {
      issues.push(`ℹ️  ${noFeedback.length} active monitor(s) have Feedback Messages DISABLED.`);
    }

    if (issues.length === 0) {
      console.log('✅ All checks passed! Your monitors should be working.');
      console.log('\n💡 If features still don\'t work, check:');
      console.log('   1. Send a message to a monitored WhatsApp group');
      console.log('   2. Check backend logs for webhook processing');
      console.log('   3. Verify your WhatsApp session is still authenticated');
      console.log('   4. Ensure backend server is running (npm run dev:backend)');
    } else {
      console.log('⚠️  Issues found:\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n💡 Fix these issues to enable all features.');

      console.log('\n🔧 Quick fix command (MongoDB):');
      console.log('   db.groupmonitors.updateMany(');
      console.log('     { isActive: true },');
      console.log('     { $set: {');
      console.log('       "settings.captureSocialLinks": true,');
      console.log('       "settings.processVoiceNotes": true,');
      console.log('       "settings.sendFeedbackMessages": true,');
      console.log('       "settings.saveAllImages": true');
      console.log('     }}');
      console.log('   )');
    }
  } catch (error) {
    console.error('❌ Error generating recommendations:', error.message);
  }

  console.log('\n🔍 ========== Diagnostics Complete ==========\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

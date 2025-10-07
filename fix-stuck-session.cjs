/**
 * Fix stuck WAHA sessions after MongoDB M2 upgrade
 *
 * Problem: Sessions created when MongoDB was rejecting writes are now stuck
 * Solution: Delete all sessions and let them recreate with working MongoDB
 */

const axios = require('axios');

const WAHA_URL = 'https://synapse-waha.onrender.com';
const API_KEY = 'waha-synapse-2025-secure';

async function fixStuckSessions() {
  console.log('🔧 Fixing stuck WAHA sessions after MongoDB M2 upgrade\n');

  try {
    // 1. Get all existing sessions
    console.log('📋 Getting current sessions...');
    const sessionsResponse = await axios.get(`${WAHA_URL}/api/sessions`, {
      headers: { 'X-API-Key': API_KEY }
    });

    const sessions = sessionsResponse.data;
    console.log(`Found ${sessions.length} sessions:\n`);

    for (const session of sessions) {
      console.log(`  - ${session.name}: ${session.status}`);
    }

    if (sessions.length === 0) {
      console.log('\n✅ No sessions to clean up!');
      return;
    }

    console.log('\n🗑️  Deleting all sessions to start fresh...\n');

    // 2. Delete each session
    for (const session of sessions) {
      try {
        console.log(`Deleting session: ${session.name}...`);

        // Stop the session first
        try {
          await axios.post(
            `${WAHA_URL}/api/sessions/${session.name}/stop`,
            {},
            { headers: { 'X-API-Key': API_KEY } }
          );
          console.log(`  ✅ Stopped ${session.name}`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        } catch (stopError) {
          console.log(`  ⚠️  Stop failed (session may already be stopped)`);
        }

        // Delete the session
        await axios.delete(
          `${WAHA_URL}/api/sessions/${session.name}`,
          { headers: { 'X-API-Key': API_KEY } }
        );
        console.log(`  ✅ Deleted ${session.name}\n`);

      } catch (deleteError) {
        console.log(`  ❌ Failed to delete ${session.name}: ${deleteError.message}\n`);
      }
    }

    console.log('✅ All sessions deleted!\n');
    console.log('📝 Next steps:');
    console.log('1. Go to your frontend: https://synapse-frontend.onrender.com');
    console.log('2. Click "Connect WhatsApp"');
    console.log('3. Wait ~10 seconds for QR code to appear');
    console.log('4. Scan QR code with your phone');
    console.log('5. Session will persist (no more repeated scans!) ✅\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

fixStuckSessions();

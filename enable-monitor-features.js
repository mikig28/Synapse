/**
 * Enable All WhatsApp Monitor Features
 *
 * Usage: node enable-monitor-features.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';

async function main() {
  console.log('🔧 ========== Enabling WhatsApp Monitor Features ==========\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully\n');

    const db = mongoose.connection.db;
    const collection = db.collection('groupmonitors');

    // Update all active monitors
    const result = await collection.updateMany(
      { isActive: true },
      {
        $set: {
          'settings.captureSocialLinks': true,
          'settings.processVoiceNotes': true,
          'settings.sendFeedbackMessages': true,
          'settings.saveAllImages': true
        }
      }
    );

    console.log('✅ Feature Update Complete:');
    console.log(`   - Matched ${result.matchedCount} active monitor(s)`);
    console.log(`   - Modified ${result.modifiedCount} monitor(s)`);
    console.log('');

    // Show updated monitors
    const monitors = await collection.find({ isActive: true }).toArray();
    console.log('📊 Updated Monitor Settings:\n');

    monitors.forEach((monitor, index) => {
      console.log(`Monitor #${index + 1}: ${monitor.groupName}`);
      console.log(`  ✅ Save All Images: ${monitor.settings?.saveAllImages ? 'ON' : 'OFF'}`);
      console.log(`  ✅ Auto-Bookmark Links: ${monitor.settings?.captureSocialLinks ? 'ON' : 'OFF'}`);
      console.log(`  ✅ Process Voice Notes: ${monitor.settings?.processVoiceNotes ? 'ON' : 'OFF'}`);
      console.log(`  ✅ Send Feedback Messages: ${monitor.settings?.sendFeedbackMessages ? 'ON' : 'OFF'}`);
      console.log('');
    });

    console.log('🎉 All features enabled! Now test by sending messages to monitored groups:\n');
    console.log('Test Cases:');
    console.log('  1. 📱 Voice Note: Send voice message → Should transcribe and create tasks/notes');
    console.log('  2. 🔖 Bookmark: Send message with URL → Should auto-bookmark');
    console.log('  3. 📸 Image: Send image → Should save to database');
    console.log('  4. 💬 Feedback: All actions should send confirmation to WhatsApp group\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log('🔍 ========== Process Complete ==========\n');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

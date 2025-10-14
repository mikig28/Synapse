#!/usr/bin/env node

/**
 * Script to enable saveAllImages for all existing group monitors
 * This ensures images are automatically saved to the Images page
 * 
 * Usage: node src/backend/scripts/enable-save-all-images.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function enableSaveAllImages() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get GroupMonitor model
    const GroupMonitor = mongoose.model('GroupMonitor', new mongoose.Schema({
      groupId: String,
      groupName: String,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      isActive: Boolean,
      settings: {
        notifyOnMatch: Boolean,
        saveAllImages: Boolean,
        confidenceThreshold: Number,
        autoReply: Boolean,
        replyMessage: String,
        captureSocialLinks: Boolean,
        processVoiceNotes: Boolean,
        sendFeedbackMessages: Boolean
      }
    }));

    // Find all monitors where saveAllImages is false or undefined
    const monitors = await GroupMonitor.find({
      $or: [
        { 'settings.saveAllImages': false },
        { 'settings.saveAllImages': { $exists: false } }
      ]
    });

    console.log(`\nFound ${monitors.length} monitor(s) to update`);

    if (monitors.length === 0) {
      console.log('✅ All monitors already have saveAllImages enabled');
      await mongoose.connection.close();
      return;
    }

    // Update each monitor
    let updated = 0;
    for (const monitor of monitors) {
      try {
        monitor.settings = monitor.settings || {};
        monitor.settings.saveAllImages = true;
        await monitor.save();
        updated++;
        console.log(`✅ Updated monitor: ${monitor.groupName} (${monitor.groupId})`);
      } catch (error) {
        console.error(`❌ Failed to update monitor ${monitor._id}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully updated ${updated}/${monitors.length} monitor(s)`);
    console.log('\n📸 Images from these groups will now be saved automatically!');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
enableSaveAllImages();

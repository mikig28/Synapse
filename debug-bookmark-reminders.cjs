/**
 * Debug script to check bookmark reminder visibility
 * Run with: node debug-bookmark-reminders.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function debugBookmarkReminders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define inline schemas since we can't import TS files
    const BookmarkItemSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      originalUrl: String,
      sourcePlatform: String,
      voiceNoteTranscription: String,
      voiceMemoAnalysis: mongoose.Schema.Types.Mixed,
      reminderId: mongoose.Schema.Types.ObjectId,
      createdAt: Date
    }, { timestamps: true, strict: false });

    const ReminderSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      bookmarkId: mongoose.Schema.Types.ObjectId,
      scheduledFor: Date,
      reminderMessage: String,
      status: String,
      priority: String,
      createdAt: Date
    }, { timestamps: true, strict: false });

    // Get or create models
    const BookmarkItem = mongoose.models.BookmarkItem || mongoose.model('BookmarkItem', BookmarkItemSchema);
    const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema);

    console.log('\n=== CHECKING RECENT BOOKMARKS ===\n');

    // Find recent bookmarks with voice notes
    const recentBookmarks = await BookmarkItem.find({
      voiceNoteTranscription: { $exists: true, $ne: null }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    if (recentBookmarks.length === 0) {
      console.log('❌ No bookmarks with voice notes found');
      process.exit(0);
    }

    for (const bookmark of recentBookmarks) {
      console.log(`\n📚 Bookmark: ${bookmark._id}`);
      console.log(`   URL: ${bookmark.originalUrl.substring(0, 60)}...`);
      console.log(`   Has Voice Note: ✅`);
      console.log(`   Transcription Preview: "${bookmark.voiceNoteTranscription.substring(0, 50)}..."`);
      console.log(`   Has reminderId field: ${bookmark.reminderId ? '✅' : '❌'}`);

      if (bookmark.voiceMemoAnalysis) {
        console.log(`   Voice Memo Analysis:`);
        console.log(`      - Has Reminder (in analysis): ${bookmark.voiceMemoAnalysis.hasReminder ? '✅' : '❌'}`);
        console.log(`      - Tags: ${bookmark.voiceMemoAnalysis.tags.join(', ') || 'none'}`);
        console.log(`      - Priority: ${bookmark.voiceMemoAnalysis.priority}`);
      } else {
        console.log(`   Voice Memo Analysis: ❌ Not present`);
      }

      // Check if reminder exists
      if (bookmark.reminderId) {
        const reminder = await Reminder.findById(bookmark.reminderId).lean();

        if (reminder) {
          console.log(`\n   🔔 Reminder Found:`);
          console.log(`      - ID: ${reminder._id}`);
          console.log(`      - Scheduled For: ${new Date(reminder.scheduledFor).toLocaleString()}`);
          console.log(`      - Message: "${reminder.reminderMessage}"`);
          console.log(`      - Status: ${reminder.status}`);
          console.log(`      - Priority: ${reminder.priority}`);
          console.log(`      - Created At: ${new Date(reminder.createdAt).toLocaleString()}`);
        } else {
          console.log(`   ❌ Reminder ID exists but reminder not found in DB`);
        }
      } else {
        console.log(`   ❌ No reminderId in bookmark`);

        // Check if orphaned reminder exists
        const orphanedReminder = await Reminder.findOne({
          bookmarkId: bookmark._id
        }).lean();

        if (orphanedReminder) {
          console.log(`   ⚠️  ISSUE FOUND: Reminder exists but not linked to bookmark!`);
          console.log(`      - Reminder ID: ${orphanedReminder._id}`);
          console.log(`      - Scheduled For: ${new Date(orphanedReminder.scheduledFor).toLocaleString()}`);
          console.log(`      - Message: "${orphanedReminder.reminderMessage}"`);
        }
      }

      console.log(`   ${'─'.repeat(70)}`);
    }

    console.log('\n=== CHECKING API ENRICHMENT ===\n');

    // Simulate what the API does
    const bookmarkIds = recentBookmarks.map(b => b._id);
    const reminders = await Reminder.find({
      bookmarkId: { $in: bookmarkIds },
      status: { $in: ['pending', 'sent'] }
    }).lean();

    console.log(`Found ${reminders.length} active reminders for ${bookmarkIds.length} bookmarks`);

    if (reminders.length > 0) {
      reminders.forEach(r => {
        console.log(`   - Reminder ${r._id} for Bookmark ${r.bookmarkId}`);
      });
    }

    console.log('\n=== RECOMMENDATIONS ===\n');

    const bookmarksWithVoiceButNoReminder = recentBookmarks.filter(b =>
      !b.reminderId && b.voiceNoteTranscription
    );

    if (bookmarksWithVoiceButNoReminder.length > 0) {
      console.log('⚠️  Found bookmarks with voice notes but NO reminders:');
      console.log(`   This suggests the AI analysis might not be detecting reminder intent.`);
      console.log(`   Check the logs when processing voice notes for analysis results.`);
    }

    const orphanedReminders = await Reminder.find({
      bookmarkId: { $in: bookmarkIds }
    }).lean();

    const linkedReminders = orphanedReminders.filter(r =>
      recentBookmarks.some(b => b.reminderId && b.reminderId.toString() === r._id.toString())
    );

    if (orphanedReminders.length > linkedReminders.length) {
      console.log(`\n⚠️  Found ${orphanedReminders.length - linkedReminders.length} orphaned reminders!`);
      console.log(`   These reminders exist but their bookmarks don't reference them.`);
      console.log(`   This suggests an issue in updateBookmarkWithAnalysis function.`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Debug complete\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugBookmarkReminders();

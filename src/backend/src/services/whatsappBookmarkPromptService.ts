import WhatsAppSessionManager from './whatsappSessionManager';
import User from '../models/User';

// Pending bookmark voice note requests
interface PendingBookmarkNote {
  bookmarkId: string;
  bookmarkUrl: string;
  timestamp: Date;
  userId: string;
}

const pendingBookmarkNotes = new Map<string, PendingBookmarkNote>(); // groupId -> pending bookmark
const BOOKMARK_NOTE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Clean up expired pending bookmark note requests
setInterval(() => {
  const now = Date.now();
  for (const [groupId, pending] of pendingBookmarkNotes.entries()) {
    if (now - pending.timestamp.getTime() > BOOKMARK_NOTE_TIMEOUT) {
      console.log(`[WhatsAppBookmarkPrompt] Clearing expired bookmark note request for group ${groupId}`);
      pendingBookmarkNotes.delete(groupId);
    }
  }
}, 60 * 1000); // Check every minute

/**
 * Prompt user for voice note after bookmark creation in WhatsApp group
 */
export const promptForWhatsAppBookmarkVoiceNote = async (
  groupId: string,
  bookmarkId: string,
  bookmarkUrl: string,
  userId: string
): Promise<void> => {
  try {
    console.log(`[WhatsAppBookmarkPrompt] Sending voice note prompt for bookmark ${bookmarkId} in group ${groupId}`);

    // Get user's WhatsApp session
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[WhatsAppBookmarkPrompt] User ${userId} not found`);
      return;
    }

    const wahaService = await WhatsAppSessionManager.getInstance().getSessionForUser(userId);

    const message = `📚 *Bookmark saved!*\n\n` +
      `🔗 ${bookmarkUrl.substring(0, 60)}${bookmarkUrl.length > 60 ? '...' : ''}\n\n` +
      `🎤 Would you like to add a note or reminder? Send a voice memo within 5 minutes.\n\n` +
      `📚 *סימניה נשמרה!*\n\n` +
      `🎤 רוצה להוסיף הערה או תזכורת? שלח הודעת קול בתוך 5 דקות.`;

    await wahaService.sendMessage(groupId, message);

    // Store pending request
    pendingBookmarkNotes.set(groupId, {
      bookmarkId,
      bookmarkUrl,
      timestamp: new Date(),
      userId,
    });

    console.log(`[WhatsAppBookmarkPrompt] ✅ Voice note prompt sent for bookmark ${bookmarkId} in group ${groupId}`);
  } catch (error) {
    console.error('[WhatsAppBookmarkPrompt] Error sending bookmark voice note prompt:', error);
  }
};

/**
 * Check if there's a pending bookmark note request for a group
 */
export const getPendingBookmarkForGroup = (groupId: string): PendingBookmarkNote | undefined => {
  return pendingBookmarkNotes.get(groupId);
};

/**
 * Clear pending bookmark note request for a group
 */
export const clearPendingBookmarkForGroup = (groupId: string): void => {
  pendingBookmarkNotes.delete(groupId);
  console.log(`[WhatsAppBookmarkPrompt] Cleared pending bookmark for group ${groupId}`);
};

/**
 * Handle voice memo for bookmark (called when a voice message is received)
 */
export const handleBookmarkVoiceMemo = async (
  groupId: string,
  userId: string,
  transcribedText: string,
  mediaFileId?: string,
  messageId?: string
): Promise<boolean> => {
  const pendingBookmark = pendingBookmarkNotes.get(groupId);

  if (!pendingBookmark || pendingBookmark.userId !== userId) {
    return false; // Not a bookmark voice memo
  }

  console.log(`[WhatsAppBookmarkPrompt] Processing voice memo for bookmark ${pendingBookmark.bookmarkId}`);

  try {
    // Import the update functions dynamically
    const { updateBookmarkWithVoiceNote, updateBookmarkWithAnalysis } = await import('../api/controllers/bookmarksController');
    const { bookmarkVoiceMemoAnalysisService } = await import('./bookmarkVoiceMemoAnalysisService');
    const { reminderService } = await import('./reminderService');
    const mongoose = await import('mongoose');

    // 1. Analyze voice memo for reminder intent
    console.log(`[WhatsAppBookmarkPrompt] ==================== BOOKMARK REMINDER ANALYSIS ====================`);
    console.log(`[WhatsAppBookmarkPrompt] Transcription: "${transcribedText}"`);
    console.log(`[WhatsAppBookmarkPrompt] Bookmark URL: ${pendingBookmark.bookmarkUrl}`);

    const analysis = await bookmarkVoiceMemoAnalysisService.analyze(
      transcribedText,
      pendingBookmark.bookmarkUrl
    );

    console.log(`[WhatsAppBookmarkPrompt] ==================== ANALYSIS COMPLETE ====================`);
    console.log(`[WhatsAppBookmarkPrompt] Has Reminder: ${analysis.hasReminder}`);
    console.log(`[WhatsAppBookmarkPrompt] Reminder Time: ${analysis.reminderTime?.toISOString() || 'N/A'}`);
    console.log(`[WhatsAppBookmarkPrompt] Tags: ${analysis.tags.join(', ')}`);
    console.log(`[WhatsAppBookmarkPrompt] Priority: ${analysis.priority}`);
    console.log(`[WhatsAppBookmarkPrompt] Language: ${analysis.language}`);

    // 2. Update bookmark with voice note
    await updateBookmarkWithVoiceNote(
      pendingBookmark.bookmarkId,
      transcribedText,
      mediaFileId,
      messageId
    );

    // 3. Create reminder if detected
    let reminderId: string | undefined;
    if (analysis.hasReminder && analysis.reminderTime) {
      console.log(`[WhatsAppBookmarkPrompt] Creating reminder for ${analysis.reminderTime.toISOString()}`);

      const reminder = await reminderService.createReminder({
        userId: new mongoose.Types.ObjectId(userId),
        bookmarkId: new mongoose.Types.ObjectId(pendingBookmark.bookmarkId),
        scheduledFor: analysis.reminderTime,
        reminderMessage: analysis.reminderMessage!,
        whatsappGroupId: groupId,
        extractedTags: analysis.tags,
        extractedNotes: analysis.notes,
        priority: analysis.priority,
        temporalExpression: analysis.temporalExpression
      });

      reminderId = reminder._id.toString();
      console.log(`[WhatsAppBookmarkPrompt] Reminder created with ID: ${reminderId}`);
    }

    // 4. Update bookmark with analysis results
    await updateBookmarkWithAnalysis(
      pendingBookmark.bookmarkId,
      {
        tags: analysis.tags,
        notes: analysis.notes,
        priority: analysis.priority,
        hasReminder: analysis.hasReminder,
        confidence: analysis.confidence
      },
      reminderId
    );

    // 5. Send bilingual confirmation message
    const isHebrew = analysis.language === 'he';
    const preview = transcribedText.substring(0, 50) + (transcribedText.length > 50 ? '...' : '');

    let confirmMessage = isHebrew ? '✅ *הערה נוספה!*\n\n' : '✅ *Note added!*\n\n';
    confirmMessage += `📝 "${preview}"\n\n`;

    if (analysis.hasReminder && analysis.reminderTime) {
      const dateStr = analysis.reminderTime.toLocaleString(isHebrew ? 'he-IL' : 'en-US', {
        dateStyle: 'short',
        timeStyle: 'short'
      });

      if (isHebrew) {
        confirmMessage += `🔔 *תזכורת נקבעה ל-${dateStr}*\n`;
        confirmMessage += `💬 ${analysis.reminderMessage}\n`;
        if (analysis.tags.length > 0) {
          confirmMessage += `🏷️ תגיות: ${analysis.tags.join(', ')}\n`;
        }
        confirmMessage += `⚡ עדיפות: ${analysis.priority}\n`;
      } else {
        confirmMessage += `🔔 *Reminder set for ${dateStr}*\n`;
        confirmMessage += `💬 ${analysis.reminderMessage}\n`;
        if (analysis.tags.length > 0) {
          confirmMessage += `🏷️ Tags: ${analysis.tags.join(', ')}\n`;
        }
        confirmMessage += `⚡ Priority: ${analysis.priority}\n`;
      }
    } else if (analysis.tags.length > 0) {
      const tagsLabel = isHebrew ? '🏷️ תגיות' : '🏷️ Tags';
      confirmMessage += `${tagsLabel}: ${analysis.tags.join(', ')}\n`;
    }

    confirmMessage += `\n🔗 ${pendingBookmark.bookmarkUrl.substring(0, 50)}${pendingBookmark.bookmarkUrl.length > 50 ? '...' : ''}`;

    // Send confirmation
    const wahaService = await WhatsAppSessionManager.getInstance().getSessionForUser(userId);
    await wahaService.sendMessage(groupId, confirmMessage);

    // Clear pending request
    clearPendingBookmarkForGroup(groupId);

    console.log(`[WhatsAppBookmarkPrompt] ✅ Successfully added voice note to bookmark ${pendingBookmark.bookmarkId}`);

    return true; // Handled as bookmark voice memo

  } catch (error) {
    console.error(`[WhatsAppBookmarkPrompt] ==================== ERROR IN REMINDER ANALYSIS ====================`);
    console.error(`[WhatsAppBookmarkPrompt] Error details:`, error);
    console.error(`[WhatsAppBookmarkPrompt] Error stack:`, (error as Error).stack);

    // Send error message
    try {
      const wahaService = await WhatsAppSessionManager.getInstance().getSessionForUser(userId);
      const errorMessage = `❌ Failed to analyze note: ${(error as Error).message}\n\nThe note was saved separately.`;
      await wahaService.sendMessage(groupId, errorMessage);
    } catch (sendError) {
      console.error(`[WhatsAppBookmarkPrompt] Failed to send error message:`, sendError);
    }

    return false;
  }
};

import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/express';
import Reminder from '../../models/Reminder';
import BookmarkItem from '../../models/BookmarkItem';
import TelegramItem from '../../models/TelegramItem';
import { reminderService } from '../../services/reminderService';

/**
 * Get user's default Telegram chat ID from their most recent message
 * Returns undefined if no Telegram messages exist (will trigger email fallback)
 */
async function getUserDefaultTelegramChatId(userId: string): Promise<number | undefined> {
  try {
    const telegramItem = await TelegramItem.findOne({
      synapseUserId: new mongoose.Types.ObjectId(userId)
    }).sort({ receivedAt: -1 });

    return telegramItem?.chatId;
  } catch (error) {
    console.error('[ReminderController] Error getting default Telegram chatId:', error);
    return undefined;
  }
}

/**
 * Toggle reminder on/off for a bookmark
 * POST /api/v1/bookmarks/:id/reminder/toggle
 */
export const toggleBookmarkReminder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: bookmarkId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(bookmarkId)) {
      return res.status(400).json({ message: 'Invalid bookmark ID' });
    }

    const bookmark = await BookmarkItem.findOne({
      _id: bookmarkId,
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    // Check if reminder exists
    if (bookmark.reminderId) {
      // Cancel existing reminder
      await Reminder.findByIdAndUpdate(bookmark.reminderId, { status: 'cancelled' });
      bookmark.reminderId = undefined;
      await bookmark.save();

      return res.status(200).json({
        message: 'Reminder cancelled',
        hasReminder: false
      });
    } else {
      // Create new reminder with default time (24 hours from now)
      const defaultTime = new Date();
      defaultTime.setDate(defaultTime.getDate() + 1);
      defaultTime.setHours(9, 0, 0, 0); // 9 AM next day

      // Get user's default Telegram chat ID (or undefined for email fallback)
      const telegramChatId = await getUserDefaultTelegramChatId(userId);

      console.log(`[ReminderController] Creating manual reminder with ${telegramChatId ? 'Telegram' : 'email'} delivery`);

      const reminder = await reminderService.createReminder({
        userId: new mongoose.Types.ObjectId(userId),
        bookmarkId: new mongoose.Types.ObjectId(bookmarkId),
        scheduledFor: defaultTime,
        reminderMessage: `Review bookmark: ${bookmark.fetchedTitle || bookmark.originalUrl}`,
        telegramChatId, // Auto-detected from user's active monitors, or undefined for email
        priority: 'medium'
      });

      bookmark.reminderId = reminder._id as mongoose.Types.ObjectId;
      await bookmark.save();

      return res.status(200).json({
        message: 'Reminder created',
        hasReminder: true,
        reminder: {
          id: reminder._id,
          scheduledFor: reminder.scheduledFor,
          message: reminder.reminderMessage,
          priority: reminder.priority
        }
      });
    }
  } catch (error) {
    console.error('[ReminderController] Error toggling reminder:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update reminder time for a bookmark
 * PATCH /api/v1/bookmarks/:id/reminder
 */
export const updateBookmarkReminder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: bookmarkId } = req.params;
    const { scheduledFor, reminderMessage, priority } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(bookmarkId)) {
      return res.status(400).json({ message: 'Invalid bookmark ID' });
    }

    if (!scheduledFor) {
      return res.status(400).json({ message: 'scheduledFor is required' });
    }

    const bookmark = await BookmarkItem.findOne({
      _id: bookmarkId,
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    let reminder;
    if (bookmark.reminderId) {
      // Update existing reminder
      reminder = await Reminder.findByIdAndUpdate(
        bookmark.reminderId,
        {
          scheduledFor: new Date(scheduledFor),
          ...(reminderMessage && { reminderMessage }),
          ...(priority && { priority }),
          status: 'pending' // Reset status if it was cancelled
        },
        { new: true }
      );
    } else {
      // Create new reminder
      // Get user's default Telegram chat ID (or undefined for email fallback)
      const telegramChatId = await getUserDefaultTelegramChatId(userId);

      console.log(`[ReminderController] Updating reminder with ${telegramChatId ? 'Telegram' : 'email'} delivery`);

      reminder = await reminderService.createReminder({
        userId: new mongoose.Types.ObjectId(userId),
        bookmarkId: new mongoose.Types.ObjectId(bookmarkId),
        scheduledFor: new Date(scheduledFor),
        reminderMessage: reminderMessage || `Review bookmark: ${bookmark.fetchedTitle || bookmark.originalUrl}`,
        telegramChatId, // Auto-detected from user's active monitors, or undefined for email
        priority: priority || 'medium'
      });

      bookmark.reminderId = reminder!._id as mongoose.Types.ObjectId;
      await bookmark.save();
    }

    return res.status(200).json({
      message: 'Reminder updated',
      reminder: {
        id: reminder!._id,
        scheduledFor: reminder!.scheduledFor,
        message: reminder!.reminderMessage,
        priority: reminder!.priority,
        status: reminder!.status
      }
    });
  } catch (error) {
    console.error('[ReminderController] Error updating reminder:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

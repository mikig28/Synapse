import mongoose from 'mongoose';
import TelegramBot from 'node-telegram-bot-api';
import Reminder, { IReminder, ReminderStatus, ReminderPriority } from '../models/Reminder';
import BookmarkItem from '../models/BookmarkItem';
import {
  CreateReminderDto,
  UpdateReminderDto,
  ReminderQueryFilters,
  ReminderNotificationResult
} from '../types/reminder.types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

class ReminderService {
  private bot: TelegramBot | null = null;
  private maxRetries: number;

  constructor() {
    if (TELEGRAM_BOT_TOKEN) {
      this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
    } else {
      console.warn('[ReminderService] TELEGRAM_BOT_TOKEN not set - notifications disabled');
    }

    this.maxRetries = parseInt(process.env.REMINDER_RETRY_ATTEMPTS || '3');
  }

  /**
   * Create a new reminder
   */
  async createReminder(data: CreateReminderDto): Promise<IReminder> {
    try {
      console.log(`[ReminderService] Creating reminder for bookmark ${data.bookmarkId}`);

      // Validate scheduled date is in future
      if (data.scheduledFor <= new Date()) {
        throw new Error('Reminder must be scheduled for a future date');
      }

      const reminder = new Reminder({
        userId: data.userId,
        bookmarkId: data.bookmarkId,
        scheduledFor: data.scheduledFor,
        reminderMessage: data.reminderMessage,
        telegramChatId: data.telegramChatId,
        extractedTags: data.extractedTags || [],
        extractedNotes: data.extractedNotes,
        priority: data.priority || 'medium',
        temporalExpression: data.temporalExpression,
        status: 'pending'
      });

      await reminder.save();

      console.log(`[ReminderService] Reminder created successfully: ${reminder._id}`);
      return reminder;

    } catch (error) {
      console.error('[ReminderService] Error creating reminder:', error);
      throw error;
    }
  }

  /**
   * Get reminder by ID
   */
  async getReminderById(reminderId: string): Promise<IReminder | null> {
    try {
      return await Reminder.findById(reminderId).populate('bookmarkId');
    } catch (error) {
      console.error(`[ReminderService] Error getting reminder ${reminderId}:`, error);
      throw error;
    }
  }

  /**
   * Get reminders with filters
   */
  async getReminders(filters: ReminderQueryFilters): Promise<IReminder[]> {
    try {
      const query: any = {};

      if (filters.userId) query.userId = filters.userId;
      if (filters.bookmarkId) query.bookmarkId = filters.bookmarkId;
      
      if (filters.status) {
        query.status = Array.isArray(filters.status) 
          ? { $in: filters.status }
          : filters.status;
      }

      if (filters.priority) {
        query.priority = Array.isArray(filters.priority)
          ? { $in: filters.priority }
          : filters.priority;
      }

      if (filters.scheduledBefore || filters.scheduledAfter) {
        query.scheduledFor = {};
        if (filters.scheduledBefore) query.scheduledFor.$lte = filters.scheduledBefore;
        if (filters.scheduledAfter) query.scheduledFor.$gte = filters.scheduledAfter;
      }

      let queryBuilder = Reminder.find(query)
        .populate('bookmarkId')
        .sort({ scheduledFor: 1 });

      if (filters.skip) queryBuilder = queryBuilder.skip(filters.skip);
      if (filters.limit) queryBuilder = queryBuilder.limit(filters.limit);

      return await queryBuilder;

    } catch (error) {
      console.error('[ReminderService] Error getting reminders:', error);
      throw error;
    }
  }

  /**
   * Get pending reminders for a user
   */
  async getPendingRemindersByUser(
    userId: mongoose.Types.ObjectId,
    limit?: number
  ): Promise<IReminder[]> {
    try {
      return await this.getReminders({
        userId,
        status: 'pending',
        limit
      });
    } catch (error) {
      console.error('[ReminderService] Error getting pending reminders:', error);
      throw error;
    }
  }

  /**
   * Update reminder
   */
  async updateReminder(
    reminderId: string,
    updates: UpdateReminderDto
  ): Promise<IReminder | null> {
    try {
      console.log(`[ReminderService] Updating reminder ${reminderId}`);

      const reminder = await Reminder.findById(reminderId);
      if (!reminder) {
        throw new Error(`Reminder not found: ${reminderId}`);
      }

      // Update fields
      if (updates.scheduledFor !== undefined) reminder.scheduledFor = updates.scheduledFor;
      if (updates.reminderMessage !== undefined) reminder.reminderMessage = updates.reminderMessage;
      if (updates.status !== undefined) reminder.status = updates.status;
      if (updates.priority !== undefined) reminder.priority = updates.priority;
      if (updates.extractedTags !== undefined) reminder.extractedTags = updates.extractedTags;
      if (updates.extractedNotes !== undefined) reminder.extractedNotes = updates.extractedNotes;

      await reminder.save();

      console.log(`[ReminderService] Reminder ${reminderId} updated successfully`);
      return reminder;

    } catch (error) {
      console.error(`[ReminderService] Error updating reminder ${reminderId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel reminder
   */
  async cancelReminder(reminderId: string): Promise<IReminder | null> {
    try {
      console.log(`[ReminderService] Cancelling reminder ${reminderId}`);

      const reminder = await Reminder.findById(reminderId);
      if (!reminder) {
        throw new Error(`Reminder not found: ${reminderId}`);
      }

      await (reminder as any).cancel();

      console.log(`[ReminderService] Reminder ${reminderId} cancelled`);
      return reminder;

    } catch (error) {
      console.error(`[ReminderService] Error cancelling reminder ${reminderId}:`, error);
      throw error;
    }
  }

  /**
   * Snooze reminder - reschedule for later
   */
  async snoozeReminder(
    reminderId: string,
    durationMinutes: number
  ): Promise<IReminder | null> {
    try {
      console.log(`[ReminderService] Snoozing reminder ${reminderId} for ${durationMinutes} minutes`);

      const reminder = await Reminder.findById(reminderId);
      if (!reminder) {
        throw new Error(`Reminder not found: ${reminderId}`);
      }

      const newDate = new Date(Date.now() + durationMinutes * 60 * 1000);
      await (reminder as any).reschedule(newDate);

      console.log(`[ReminderService] Reminder ${reminderId} snoozed until ${newDate}`);
      return reminder;

    } catch (error) {
      console.error(`[ReminderService] Error snoozing reminder ${reminderId}:`, error);
      throw error;
    }
  }

  /**
   * Delete reminder
   */
  async deleteReminder(reminderId: string): Promise<boolean> {
    try {
      console.log(`[ReminderService] Deleting reminder ${reminderId}`);

      const result = await Reminder.findByIdAndDelete(reminderId);
      
      if (!result) {
        throw new Error(`Reminder not found: ${reminderId}`);
      }

      console.log(`[ReminderService] Reminder ${reminderId} deleted`);
      return true;

    } catch (error) {
      console.error(`[ReminderService] Error deleting reminder ${reminderId}:`, error);
      throw error;
    }
  }

  /**
   * Send reminder notification via Telegram
   */
  async sendReminderNotification(reminderId: string): Promise<ReminderNotificationResult> {
    try {
      if (!this.bot) {
        throw new Error('Telegram bot not initialized');
      }

      const reminder = await Reminder.findById(reminderId).populate('bookmarkId');
      
      if (!reminder) {
        throw new Error(`Reminder not found: ${reminderId}`);
      }

      if (reminder.status !== 'pending') {
        console.log(`[ReminderService] Skipping non-pending reminder ${reminderId} (status: ${reminder.status})`);
        return {
          success: false,
          reminderId: reminder._id as mongoose.Types.ObjectId,
          error: 'Reminder is not pending'
        };
      }

      const bookmark = reminder.bookmarkId as any;
      if (!bookmark) {
        throw new Error('Bookmark not found for reminder');
      }

      // Format message
      const message = this.formatReminderMessage(reminder, bookmark);

      // Send via Telegram
      await this.bot.sendMessage(reminder.telegramChatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });

      // Mark as sent
      await (reminder as any).markAsSent();

      console.log(`[ReminderService] Notification sent for reminder ${reminderId}`);

      return {
        success: true,
        reminderId: reminder._id as mongoose.Types.ObjectId,
        sentAt: new Date()
      };

    } catch (error: any) {
      console.error(`[ReminderService] Error sending notification for ${reminderId}:`, error);

      // Mark as failed
      try {
        const reminder = await Reminder.findById(reminderId);
        if (reminder) {
          await (reminder as any).markAsFailed(error.message || 'Unknown error');

          // Retry if under max retries
          if (reminder.failureCount && reminder.failureCount < this.maxRetries) {
            console.log(`[ReminderService] Will retry reminder ${reminderId} (attempt ${reminder.failureCount + 1}/${this.maxRetries})`);
          }
        }
      } catch (updateError) {
        console.error('[ReminderService] Error updating failed reminder:', updateError);
      }

      return {
        success: false,
        reminderId: new mongoose.Types.ObjectId(reminderId),
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Format reminder message for Telegram
   */
  private formatReminderMessage(reminder: IReminder, bookmark: any): string {
    const isHebrew = reminder.reminderMessage.match(/[֐-׿]/);

    if (isHebrew) {
      let message = `🔔 *תזכורת!*

`;
      message += `📝 ${reminder.reminderMessage}

`;
      message += `🔗 ${bookmark.originalUrl}
`;

      if (bookmark.fetchedTitle) {
        message += `
📌 *כותרת:* ${bookmark.fetchedTitle}`;
      }

      if (reminder.extractedTags && reminder.extractedTags.length > 0) {
        message += `

🏷️ *תגיות:* ${reminder.extractedTags.join(', ')}`;
      }

      if (reminder.extractedNotes) {
        message += `

💭 *הערות:* ${reminder.extractedNotes.substring(0, 200)}${reminder.extractedNotes.length > 200 ? '...' : ''}`;
      }

      const priorityEmoji = reminder.priority === 'high' ? '🔥' : reminder.priority === 'medium' ? '⚡' : '📌';
      message += `

${priorityEmoji} *עדיפות:* ${reminder.priority}`;

      return message;
    } else {
      let message = `🔔 *Reminder!*

`;
      message += `📝 ${reminder.reminderMessage}

`;
      message += `🔗 ${bookmark.originalUrl}
`;

      if (bookmark.fetchedTitle) {
        message += `
📌 *Title:* ${bookmark.fetchedTitle}`;
      }

      if (reminder.extractedTags && reminder.extractedTags.length > 0) {
        message += `

🏷️ *Tags:* ${reminder.extractedTags.join(', ')}`;
      }

      if (reminder.extractedNotes) {
        message += `

💭 *Notes:* ${reminder.extractedNotes.substring(0, 200)}${reminder.extractedNotes.length > 200 ? '...' : ''}`;
      }

      const priorityEmoji = reminder.priority === 'high' ? '🔥' : reminder.priority === 'medium' ? '⚡' : '📌';
      message += `

${priorityEmoji} *Priority:* ${reminder.priority}`;

      return message;
    }
  }

  /**
   * Get statistics for a user's reminders
   */
  async getReminderStats(userId: mongoose.Types.ObjectId): Promise<{
    total: number;
    pending: number;
    sent: number;
    cancelled: number;
    failed: number;
    upcoming: IReminder[];
  }> {
    try {
      const [total, pending, sent, cancelled, failed] = await Promise.all([
        Reminder.countDocuments({ userId }),
        Reminder.countDocuments({ userId, status: 'pending' }),
        Reminder.countDocuments({ userId, status: 'sent' }),
        Reminder.countDocuments({ userId, status: 'cancelled' }),
        Reminder.countDocuments({ userId, status: 'failed' })
      ]);

      const upcoming = await this.getReminders({
        userId,
        status: 'pending',
        scheduledAfter: new Date(),
        limit: 5
      });

      return { total, pending, sent, cancelled, failed, upcoming };

    } catch (error) {
      console.error('[ReminderService] Error getting reminder stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const reminderService = new ReminderService();

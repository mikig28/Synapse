import cron from 'node-cron';
import Reminder from '../models/Reminder';
import { reminderService } from './reminderService';

class ReminderSchedulerService {
  private isRunning: boolean = false;
  private cronTask: cron.ScheduledTask | null = null;
  private checkIntervalMinutes: number;

  constructor() {
    // Check every minute by default
    this.checkIntervalMinutes = 1;
    console.log('[ReminderScheduler] Scheduler initialized');
  }

  /**
   * Start the reminder scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('[ReminderScheduler] Scheduler already running');
      return;
    }

    // Run every minute: '* * * * *'
    this.cronTask = cron.schedule('* * * * *', async () => {
      await this.checkAndSendDueReminders();
    });

    this.isRunning = true;
    console.log('[ReminderScheduler] ✅ Scheduler started - checking every minute for due reminders');
  }

  /**
   * Stop the reminder scheduler
   */
  stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }

    this.isRunning = false;
    console.log('[ReminderScheduler] Scheduler stopped');
  }

  /**
   * Check for due reminders and send notifications
   */
  private async checkAndSendDueReminders(): Promise<void> {
    try {
      const now = new Date();
      
      // Get all pending reminders that are due
      const dueReminders = await Reminder.getDueReminders();

      if (dueReminders.length === 0) {
        return; // No reminders due
      }

      console.log(`[ReminderScheduler] Found ${dueReminders.length} due reminders at ${now.toISOString()}`);

      // Process reminders concurrently
      const results = await Promise.allSettled(
        dueReminders.map(reminder => 
          reminderService.sendReminderNotification(reminder._id.toString())
        )
      );

      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      console.log(`[ReminderScheduler] Processed ${dueReminders.length} reminders: ${successful} sent, ${failed} failed`);

      // Retry failed reminders that haven't exceeded max retries
      await this.retryFailedReminders();

    } catch (error) {
      console.error('[ReminderScheduler] Error checking due reminders:', error);
    }
  }

  /**
   * Retry reminders that failed but haven't exceeded max retries
   */
  private async retryFailedReminders(): Promise<void> {
    try {
      const maxRetries = parseInt(process.env.REMINDER_RETRY_ATTEMPTS || '3');
      
      // Find failed reminders that can be retried
      const retryableReminders = await Reminder.find({
        status: 'failed',
        failureCount: { $lt: maxRetries },
        scheduledFor: { $lte: new Date() }
      }).limit(10); // Limit retries per cycle to avoid overwhelming

      if (retryableReminders.length === 0) {
        return;
      }

      console.log(`[ReminderScheduler] Retrying ${retryableReminders.length} failed reminders`);

      // Reset to pending and retry
      for (const reminder of retryableReminders) {
        reminder.status = 'pending';
        await reminder.save();
        
        // Small delay between retries
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error('[ReminderScheduler] Error retrying failed reminders:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; checkInterval: string } {
    return {
      isRunning: this.isRunning,
      checkInterval: `Every ${this.checkIntervalMinutes} minute(s)`
    };
  }

  /**
   * Manually trigger reminder check (for testing)
   */
  async triggerCheck(): Promise<void> {
    console.log('[ReminderScheduler] Manual trigger requested');
    await this.checkAndSendDueReminders();
  }

  /**
   * Get upcoming reminders (next 24 hours)
   */
  async getUpcomingReminders(limit: number = 10): Promise<any[]> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingReminders = await Reminder.find({
        status: 'pending',
        scheduledFor: { $gte: now, $lte: tomorrow }
      })
      .populate('bookmarkId')
      .sort({ scheduledFor: 1 })
      .limit(limit);

      return upcomingReminders;

    } catch (error) {
      console.error('[ReminderScheduler] Error getting upcoming reminders:', error);
      return [];
    }
  }

  /**
   * Clean up old sent/cancelled reminders (housekeeping)
   */
  async cleanupOldReminders(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Reminder.deleteMany({
        status: { $in: ['sent', 'cancelled'] },
        updatedAt: { $lt: cutoffDate }
      });

      const deletedCount = result.deletedCount || 0;

      if (deletedCount > 0) {
        console.log(`[ReminderScheduler] Cleaned up ${deletedCount} old reminders (older than ${daysOld} days)`);
      }

      return deletedCount;

    } catch (error) {
      console.error('[ReminderScheduler] Error cleaning up old reminders:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const reminderSchedulerService = new ReminderSchedulerService();

// Helper function to initialize scheduler (called from server.ts)
export const initializeReminderScheduler = (): void => {
  reminderSchedulerService.start();
  
  // Schedule daily cleanup at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[ReminderScheduler] Running daily cleanup...');
    await reminderSchedulerService.cleanupOldReminders(30);
  });
};

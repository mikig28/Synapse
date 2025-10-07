/**
 * WhatsApp Message Cleanup Service
 * Automatically removes old WhatsApp messages to prevent MongoDB storage bloat
 *
 * This service:
 * - Runs on server startup
 * - Runs daily at scheduled time
 * - Deletes messages older than configurable retention period (default 3 days)
 * - Preserves recent messages for context
 */

import { scheduleJob } from 'node-schedule';
import WhatsAppMessage from '../models/WhatsAppMessage';
import WhatsAppGroupSummary from '../models/WhatsAppGroupSummary';

interface CleanupStats {
  messagesDeleted: number;
  summariesDeleted: number;
  spaceSavedMB: number;
  executionTimeMs: number;
}

export class WhatsAppMessageCleanupService {
  private static instance: WhatsAppMessageCleanupService;
  private retentionDays: number;
  private cleanupSchedule: string;
  private isRunning: boolean = false;

  private constructor() {
    // Read from environment or use defaults
    this.retentionDays = parseInt(process.env.WHATSAPP_MESSAGE_RETENTION_DAYS || '3', 10);
    this.cleanupSchedule = process.env.WHATSAPP_CLEANUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
  }

  static getInstance(): WhatsAppMessageCleanupService {
    if (!WhatsAppMessageCleanupService.instance) {
      WhatsAppMessageCleanupService.instance = new WhatsAppMessageCleanupService();
    }
    return WhatsAppMessageCleanupService.instance;
  }

  /**
   * Initialize cleanup service with scheduled job
   */
  initialize(): void {
    console.log(`[WhatsApp Cleanup] Initializing with ${this.retentionDays}-day retention`);
    console.log(`[WhatsApp Cleanup] Schedule: ${this.cleanupSchedule}`);

    // Run cleanup on startup (after 30 seconds delay to allow app to fully start)
    setTimeout(() => {
      console.log('[WhatsApp Cleanup] Running initial cleanup on startup...');
      this.runCleanup().catch((error) => {
        console.error('[WhatsApp Cleanup] Startup cleanup failed:', error);
      });
    }, 30000);

    // Schedule daily cleanup
    scheduleJob(this.cleanupSchedule, () => {
      console.log('[WhatsApp Cleanup] Running scheduled cleanup...');
      this.runCleanup().catch((error) => {
        console.error('[WhatsApp Cleanup] Scheduled cleanup failed:', error);
      });
    });

    console.log('[WhatsApp Cleanup] ✅ Service initialized');
  }

  /**
   * Run cleanup operation
   */
  async runCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      console.log('[WhatsApp Cleanup] ⚠️ Cleanup already running, skipping...');
      throw new Error('Cleanup already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`[WhatsApp Cleanup] 🗑️ Starting cleanup (retention: ${this.retentionDays} days)...`);

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      console.log(`[WhatsApp Cleanup] Cutoff date: ${cutoffDate.toISOString()}`);
      console.log(`[WhatsApp Cleanup] Deleting messages created before: ${cutoffDate.toLocaleString()}`);

      // Delete old messages
      const messageResult = await WhatsAppMessage.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      console.log(`[WhatsApp Cleanup] ✅ Deleted ${messageResult.deletedCount} old messages`);

      // Delete old summaries (keep longer - 30 days)
      const summaryCutoffDate = new Date();
      summaryCutoffDate.setDate(summaryCutoffDate.getDate() - 30);

      const summaryResult = await WhatsAppGroupSummary.deleteMany({
        createdAt: { $lt: summaryCutoffDate }
      });

      console.log(`[WhatsApp Cleanup] ✅ Deleted ${summaryResult.deletedCount} old summaries`);

      // Estimate space saved (rough estimate: 700 bytes per message)
      const spaceSavedMB = (messageResult.deletedCount * 700) / (1024 * 1024);

      const executionTimeMs = Date.now() - startTime;

      const stats: CleanupStats = {
        messagesDeleted: messageResult.deletedCount,
        summariesDeleted: summaryResult.deletedCount,
        spaceSavedMB: parseFloat(spaceSavedMB.toFixed(2)),
        executionTimeMs
      };

      console.log(`[WhatsApp Cleanup] 🎉 Cleanup complete!`);
      console.log(`[WhatsApp Cleanup] Messages deleted: ${stats.messagesDeleted}`);
      console.log(`[WhatsApp Cleanup] Summaries deleted: ${stats.summariesDeleted}`);
      console.log(`[WhatsApp Cleanup] Space saved: ~${stats.spaceSavedMB} MB`);
      console.log(`[WhatsApp Cleanup] Execution time: ${stats.executionTimeMs}ms`);

      return stats;
    } catch (error) {
      console.error('[WhatsApp Cleanup] ❌ Cleanup failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): { retentionDays: number; cleanupSchedule: string } {
    return {
      retentionDays: this.retentionDays,
      cleanupSchedule: this.cleanupSchedule
    };
  }

  /**
   * Manually trigger cleanup (for testing or emergency)
   */
  async triggerManualCleanup(): Promise<CleanupStats> {
    console.log('[WhatsApp Cleanup] Manual cleanup triggered');
    return this.runCleanup();
  }
}

export default WhatsAppMessageCleanupService;

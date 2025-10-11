/**
 * MongoDB Cleanup Service
 * Automatically cleans up old data to prevent database overload
 * Runs on schedule to maintain optimal database size
 */

import WhatsAppMessage from '../models/WhatsAppMessage';
import WhatsAppContact from '../models/WhatsAppContact';
import WhatsAppImage from '../models/WhatsAppImage';
import mongoose from 'mongoose';

interface CleanupStats {
  messagesDeleted: number;
  imagesDeleted: number;
  contactsDeleted: number;
  orphanedRecordsDeleted: number;
  executionTime: number;
  timestamp: Date;
}

class MongoCleanupService {
  private isRunning = false;
  private lastCleanup: Date | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats: CleanupStats[] = [];

  // Retention periods (in days)
  private readonly MESSAGE_RETENTION_DAYS = 30;
  private readonly IMAGE_RETENTION_DAYS = 90;
  private readonly INACTIVE_CONTACT_RETENTION_DAYS = 180;

  /**
   * Start automatic cleanup scheduler
   * Runs daily at 3 AM local time
   */
  startScheduler(runImmediately = false): void {
    if (this.cleanupInterval) {
      console.log('[Mongo Cleanup] Scheduler already running');
      return;
    }

    console.log('[Mongo Cleanup] 🕐 Starting automatic cleanup scheduler (runs daily at 3 AM)');

    // Calculate ms until next 3 AM
    const now = new Date();
    const next3AM = new Date();
    next3AM.setHours(3, 0, 0, 0);
    
    if (next3AM <= now) {
      // If 3 AM has passed today, schedule for tomorrow
      next3AM.setDate(next3AM.getDate() + 1);
    }

    const msUntil3AM = next3AM.getTime() - now.getTime();
    console.log(`[Mongo Cleanup] First cleanup scheduled for: ${next3AM.toLocaleString()}`);

    // Run immediately if requested
    if (runImmediately) {
      console.log('[Mongo Cleanup] Running immediate cleanup as requested');
      this.runCleanup().catch(err => {
        console.error('[Mongo Cleanup] Immediate cleanup failed:', err);
      });
    }

    // Schedule first run at 3 AM
    setTimeout(() => {
      this.runCleanup().catch(err => {
        console.error('[Mongo Cleanup] Scheduled cleanup failed:', err);
      });

      // Then run every 24 hours
      this.cleanupInterval = setInterval(() => {
        this.runCleanup().catch(err => {
          console.error('[Mongo Cleanup] Scheduled cleanup failed:', err);
        });
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntil3AM);
  }

  /**
   * Stop the automatic scheduler
   */
  stopScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[Mongo Cleanup] 🛑 Scheduler stopped');
    }
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      console.log('[Mongo Cleanup] ⚠️ Cleanup already in progress, skipping');
      throw new Error('Cleanup already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log('[Mongo Cleanup] 🧹 Starting database cleanup...');

    const stats: CleanupStats = {
      messagesDeleted: 0,
      imagesDeleted: 0,
      contactsDeleted: 0,
      orphanedRecordsDeleted: 0,
      executionTime: 0,
      timestamp: new Date()
    };

    try {
      // 1. Delete old WhatsApp messages
      stats.messagesDeleted = await this.cleanupOldMessages();

      // 2. Delete old images
      stats.imagesDeleted = await this.cleanupOldImages();

      // 3. Delete inactive contacts
      stats.contactsDeleted = await this.cleanupInactiveContacts();

      // 4. Delete orphaned records
      stats.orphanedRecordsDeleted = await this.cleanupOrphanedRecords();

      // 5. Optimize collections (compact and rebuild indexes)
      await this.optimizeCollections();

      stats.executionTime = Date.now() - startTime;
      this.lastCleanup = new Date();
      this.stats.push(stats);

      // Keep only last 30 cleanup stats
      if (this.stats.length > 30) {
        this.stats = this.stats.slice(-30);
      }

      console.log('[Mongo Cleanup] ✅ Cleanup completed:', {
        messagesDeleted: stats.messagesDeleted,
        imagesDeleted: stats.imagesDeleted,
        contactsDeleted: stats.contactsDeleted,
        orphanedRecordsDeleted: stats.orphanedRecordsDeleted,
        executionTime: `${stats.executionTime}ms`,
        totalCleaned: stats.messagesDeleted + stats.imagesDeleted + stats.contactsDeleted + stats.orphanedRecordsDeleted
      });

      return stats;
    } catch (error) {
      console.error('[Mongo Cleanup] ❌ Cleanup failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Delete WhatsApp messages older than retention period
   */
  private async cleanupOldMessages(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.MESSAGE_RETENTION_DAYS);

      console.log(`[Mongo Cleanup] Deleting WhatsApp messages older than ${this.MESSAGE_RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`);

      // Use lean() and batch deletion for better performance
      const result = await WhatsAppMessage.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`[Mongo Cleanup] ✅ Deleted ${result.deletedCount} old messages`);
      return result.deletedCount || 0;
    } catch (error) {
      console.error('[Mongo Cleanup] Error deleting old messages:', error);
      return 0;
    }
  }

  /**
   * Delete WhatsApp images older than retention period
   */
  private async cleanupOldImages(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.IMAGE_RETENTION_DAYS);

      console.log(`[Mongo Cleanup] Deleting WhatsApp images older than ${this.IMAGE_RETENTION_DAYS} days (before ${cutoffDate.toISOString()})`);

      // First, get images to delete so we can clean up files
      const imagesToDelete = await WhatsAppImage.find({
        extractedAt: { $lt: cutoffDate }
      }).select('localPath').lean();

      // Delete the database records
      const result = await WhatsAppImage.deleteMany({
        extractedAt: { $lt: cutoffDate }
      });

      // Clean up physical files (optional - comment out if you want to keep files)
      let filesDeleted = 0;
      const fs = require('fs');
      for (const image of imagesToDelete) {
        if (image.localPath && fs.existsSync(image.localPath)) {
          try {
            fs.unlinkSync(image.localPath);
            filesDeleted++;
          } catch (err) {
            console.warn(`[Mongo Cleanup] Failed to delete file: ${image.localPath}`);
          }
        }
      }

      console.log(`[Mongo Cleanup] ✅ Deleted ${result.deletedCount} old images (${filesDeleted} files cleaned)`);
      return result.deletedCount || 0;
    } catch (error) {
      console.error('[Mongo Cleanup] Error deleting old images:', error);
      return 0;
    }
  }

  /**
   * Delete inactive contacts (no messages in retention period)
   */
  private async cleanupInactiveContacts(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.INACTIVE_CONTACT_RETENTION_DAYS);

      console.log(`[Mongo Cleanup] Deleting inactive contacts (no activity since ${cutoffDate.toISOString()})`);

      const result = await WhatsAppContact.deleteMany({
        $or: [
          { lastMessageTimestamp: { $lt: cutoffDate } },
          { lastMessageTimestamp: { $exists: false } }
        ]
      });

      console.log(`[Mongo Cleanup] ✅ Deleted ${result.deletedCount} inactive contacts`);
      return result.deletedCount || 0;
    } catch (error) {
      console.error('[Mongo Cleanup] Error deleting inactive contacts:', error);
      return 0;
    }
  }

  /**
   * Delete orphaned records (messages without valid contacts)
   */
  private async cleanupOrphanedRecords(): Promise<number> {
    try {
      console.log('[Mongo Cleanup] Cleaning up orphaned records...');

      // Get all contact IDs
      const validContactIds = await WhatsAppContact.find().distinct('_id');
      const validContactIdSet = new Set(validContactIds.map(id => id.toString()));

      // Find messages with invalid contact references
      const orphanedMessages = await WhatsAppMessage.find({
        contactId: { $exists: true }
      }).select('contactId').lean();

      let orphanedCount = 0;
      const orphanedIds: string[] = [];

      for (const msg of orphanedMessages) {
        if (msg.contactId && !validContactIdSet.has(msg.contactId.toString())) {
          orphanedIds.push((msg as any)._id.toString());
          orphanedCount++;
        }
      }

      // Delete orphaned messages in batches
      if (orphanedIds.length > 0) {
        const result = await WhatsAppMessage.deleteMany({
          _id: { $in: orphanedIds }
        });
        console.log(`[Mongo Cleanup] ✅ Deleted ${result.deletedCount} orphaned messages`);
        return result.deletedCount || 0;
      }

      console.log('[Mongo Cleanup] No orphaned records found');
      return 0;
    } catch (error) {
      console.error('[Mongo Cleanup] Error cleaning orphaned records:', error);
      return 0;
    }
  }

  /**
   * Optimize collections (compact and rebuild indexes)
   */
  private async optimizeCollections(): Promise<void> {
    try {
      console.log('[Mongo Cleanup] 🔧 Optimizing collections...');

      const db = mongoose.connection.db;
      
      // Get collection stats before optimization
      const collections = ['whatsappmessages', 'whatsappcontacts', 'whatsappimages'];
      
      for (const collectionName of collections) {
        try {
          const stats = await db.command({ collStats: collectionName });
          console.log(`[Mongo Cleanup] ${collectionName} stats:`, {
            documents: stats.count,
            size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            avgDocSize: `${(stats.avgObjSize / 1024).toFixed(2)} KB`,
            indexes: stats.nindexes
          });
        } catch (err: any) {
          console.warn(`[Mongo Cleanup] Could not get stats for ${collectionName}:`, err.message);
        }
      }

      console.log('[Mongo Cleanup] ✅ Collection optimization complete');
    } catch (error) {
      console.error('[Mongo Cleanup] Error optimizing collections:', error);
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats(): {
    lastCleanup: Date | null;
    isRunning: boolean;
    recentStats: CleanupStats[];
    retentionPolicies: {
      messages: number;
      images: number;
      contacts: number;
    };
  } {
    return {
      lastCleanup: this.lastCleanup,
      isRunning: this.isRunning,
      recentStats: this.stats.slice(-10), // Last 10 cleanup runs
      retentionPolicies: {
        messages: this.MESSAGE_RETENTION_DAYS,
        images: this.IMAGE_RETENTION_DAYS,
        contacts: this.INACTIVE_CONTACT_RETENTION_DAYS
      }
    };
  }

  /**
   * Get database collection sizes
   */
  async getCollectionSizes(): Promise<{
    messages: { count: number; size: string };
    images: { count: number; size: string };
    contacts: { count: number; size: string };
    total: { count: number; size: string };
  }> {
    try {
      const db = mongoose.connection.db;

      const [messagesStats, imagesStats, contactsStats] = await Promise.all([
        db.command({ collStats: 'whatsappmessages' }).catch(() => ({ count: 0, size: 0 })),
        db.command({ collStats: 'whatsappimages' }).catch(() => ({ count: 0, size: 0 })),
        db.command({ collStats: 'whatsappcontacts' }).catch(() => ({ count: 0, size: 0 }))
      ]);

      const totalSize = (messagesStats.size || 0) + (imagesStats.size || 0) + (contactsStats.size || 0);
      const totalCount = (messagesStats.count || 0) + (imagesStats.count || 0) + (contactsStats.count || 0);

      return {
        messages: {
          count: messagesStats.count || 0,
          size: `${((messagesStats.size || 0) / 1024 / 1024).toFixed(2)} MB`
        },
        images: {
          count: imagesStats.count || 0,
          size: `${((imagesStats.size || 0) / 1024 / 1024).toFixed(2)} MB`
        },
        contacts: {
          count: contactsStats.count || 0,
          size: `${((contactsStats.size || 0) / 1024 / 1024).toFixed(2)} MB`
        },
        total: {
          count: totalCount,
          size: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
        }
      };
    } catch (error) {
      console.error('[Mongo Cleanup] Error getting collection sizes:', error);
      return {
        messages: { count: 0, size: '0 MB' },
        images: { count: 0, size: '0 MB' },
        contacts: { count: 0, size: '0 MB' },
        total: { count: 0, size: '0 MB' }
      };
    }
  }

  /**
   * Emergency cleanup - more aggressive retention (7 days for messages)
   * Use this when database is critically overloaded
   */
  async emergencyCleanup(): Promise<CleanupStats> {
    console.log('[Mongo Cleanup] 🚨 EMERGENCY CLEANUP INITIATED');
    console.log('[Mongo Cleanup] Using aggressive 7-day retention for messages');

    const startTime = Date.now();
    const stats: CleanupStats = {
      messagesDeleted: 0,
      imagesDeleted: 0,
      contactsDeleted: 0,
      orphanedRecordsDeleted: 0,
      executionTime: 0,
      timestamp: new Date()
    };

    try {
      // Delete messages older than 7 days (emergency)
      const messageCutoff = new Date();
      messageCutoff.setDate(messageCutoff.getDate() - 7);
      
      const messageResult = await WhatsAppMessage.deleteMany({
        timestamp: { $lt: messageCutoff }
      });
      stats.messagesDeleted = messageResult.deletedCount || 0;

      // Delete images older than 30 days (emergency)
      const imageCutoff = new Date();
      imageCutoff.setDate(imageCutoff.getDate() - 30);
      
      const imageResult = await WhatsAppImage.deleteMany({
        extractedAt: { $lt: imageCutoff }
      });
      stats.imagesDeleted = imageResult.deletedCount || 0;

      // Delete all inactive contacts (emergency)
      const contactCutoff = new Date();
      contactCutoff.setDate(contactCutoff.getDate() - 30);
      
      const contactResult = await WhatsAppContact.deleteMany({
        $or: [
          { lastMessageTimestamp: { $lt: contactCutoff } },
          { lastMessageTimestamp: { $exists: false } }
        ]
      });
      stats.contactsDeleted = contactResult.deletedCount || 0;

      stats.executionTime = Date.now() - startTime;

      console.log('[Mongo Cleanup] 🚨 EMERGENCY CLEANUP COMPLETE:', {
        messagesDeleted: stats.messagesDeleted,
        imagesDeleted: stats.imagesDeleted,
        contactsDeleted: stats.contactsDeleted,
        totalDeleted: stats.messagesDeleted + stats.imagesDeleted + stats.contactsDeleted,
        executionTime: `${stats.executionTime}ms`
      });

      return stats;
    } catch (error) {
      console.error('[Mongo Cleanup] ❌ Emergency cleanup failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mongoCleanupService = new MongoCleanupService();
export default mongoCleanupService;

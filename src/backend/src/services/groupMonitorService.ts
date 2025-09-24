import GroupMonitor, { IGroupMonitor } from '../models/GroupMonitor';
import FilteredImage, { IFilteredImage } from '../models/FilteredImage';
import PersonProfile from '../models/PersonProfile';
import WAHAService from './wahaService';
import WhatsAppBaileysService from './whatsappBaileysService';
import axios from 'axios';
import mongoose, { Types } from 'mongoose';

export interface GroupMonitorSettings {
  notifyOnMatch: boolean;
  saveAllImages: boolean;
  confidenceThreshold: number;
  autoReply: boolean;
  replyMessage?: string;
}

export interface CreateGroupMonitorData {
  groupId: string;
  groupName: string;
  targetPersons: string[];
  settings?: Partial<GroupMonitorSettings>;
}

export interface FaceMatchResult {
  faceId: number;
  location: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  matches: {
    personId: string;
    personName: string;
    confidence: number;
    distance: number;
  }[];
}

export interface ImageProcessingResult {
  success: boolean;
  processingTime: number;
  facesDetected: number;
  imageDimensions: {
    width: number;
    height: number;
  };
  matches: FaceMatchResult[];
  error?: string;
}

class GroupMonitorService {
  private wahaService: WAHAService;
  private faceRecognitionUrl: string;

  constructor() {
    this.wahaService = WAHAService.getInstance();
    this.faceRecognitionUrl = process.env.FACE_RECOGNITION_SERVICE_URL || 'http://localhost:5001';
  }

  /**
   * Create a new group monitor
   */
  async createGroupMonitor(
    userId: string,
    monitorData: CreateGroupMonitorData
  ): Promise<IGroupMonitor> {
    try {
      // Validate target persons belong to user
      const targetPersons = await PersonProfile.find({
        _id: { $in: monitorData.targetPersons.map(id => new Types.ObjectId(id)) },
        userId: new Types.ObjectId(userId),
        isActive: true
      });

      if (targetPersons.length !== monitorData.targetPersons.length) {
        throw new Error('Some target persons not found or do not belong to user');
      }

      // Check if monitor already exists for this group and user
      const existingMonitor = await GroupMonitor.findOne({
        groupId: monitorData.groupId,
        userId: new Types.ObjectId(userId)
      });

      if (existingMonitor) {
        throw new Error('Group monitor already exists for this group');
      }

      const defaultSettings: GroupMonitorSettings = {
        notifyOnMatch: true,
        saveAllImages: false,
        confidenceThreshold: 0.7,
        autoReply: false,
        ...monitorData.settings
      };

      const groupMonitor = new GroupMonitor({
        groupId: monitorData.groupId,
        groupName: monitorData.groupName,
        userId: new Types.ObjectId(userId),
        targetPersons: targetPersons.map(p => p._id as mongoose.Types.ObjectId),
        settings: defaultSettings,
        isActive: true,
        statistics: {
          totalMessages: 0,
          imagesProcessed: 0,
          personsDetected: 0
        }
      });

      return await groupMonitor.save();
    } catch (error) {
      console.error('Error creating group monitor:', error);
      throw new Error(`Failed to create group monitor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all group monitors for a user
   */
  async getGroupMonitorsByUser(userId: string): Promise<IGroupMonitor[]> {
    try {
      return await GroupMonitor.find({
        userId: new Types.ObjectId(userId)
      })
      .populate('targetPersons', 'name description')
      .sort({ updatedAt: -1 });
    } catch (error) {
      console.error('Error fetching group monitors:', error);
      throw new Error('Failed to fetch group monitors');
    }
  }

  /**
   * Get active group monitors for a specific group
   */
  async getActiveMonitorsForGroup(groupId: string): Promise<IGroupMonitor[]> {
    console.log(`[GroupMonitorService] 🔍 Searching for active monitors with groupId: "${groupId}"`);

    try {
      // First, let's see what group IDs exist in the database for debugging
      const allGroups = await GroupMonitor.find({ isActive: true }).select('groupId groupName _id').limit(10);
      console.log(`[GroupMonitorService] 📋 Sample of existing active monitors in database:`,
        allGroups.map(m => ({
          id: m._id.toString(),
          groupId: m.groupId,
          groupName: m.groupName,
          exactMatch: m.groupId === groupId
        }))
      );

      // Try exact match first
      let monitors = await GroupMonitor.find({
        groupId: groupId,
        isActive: true
      }).populate('targetPersons', 'name faceEmbeddings');

      console.log(`[GroupMonitorService] 🎯 Exact match found ${monitors.length} monitors for groupId: "${groupId}"`);

      // If no exact matches, try alternative matching patterns for WhatsApp group IDs
      if (monitors.length === 0) {
        console.log(`[GroupMonitorService] 🔍 No exact matches, trying alternative group ID formats...`);

        // WhatsApp group IDs can have different formats, try some variations
        const alternativeQueries = [
          { groupId: groupId.replace('@g.us', '') }, // Remove @g.us suffix
          { groupId: groupId + '@g.us' }, // Add @g.us suffix
          { groupId: { $regex: new RegExp(groupId.replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&'), 'i') } } // Case-insensitive partial match
        ];

        for (const query of alternativeQueries) {
          console.log(`[GroupMonitorService] 🔍 Trying query:`, query);
          const alternativeMonitors = await GroupMonitor.find({
            ...query,
            isActive: true
          }).populate('targetPersons', 'name faceEmbeddings').limit(5);

          if (alternativeMonitors.length > 0) {
            console.log(`[GroupMonitorService] ✅ Found ${alternativeMonitors.length} monitors with alternative query:`,
              alternativeMonitors.map(m => ({ id: m._id.toString(), groupId: m.groupId, groupName: m.groupName }))
            );
            monitors = alternativeMonitors;
            break;
          }
        }
      }

      console.log(`[GroupMonitorService] 📊 Final result: ${monitors.length} active monitors found for group "${groupId}"`);

      return monitors;
    } catch (error) {
      console.error(`[GroupMonitorService] ❌ Error fetching active monitors for group "${groupId}":`, error);
      throw new Error('Failed to fetch active monitors');
    }
  }

  /**
   * Update group monitor settings
   */
  async updateGroupMonitor(
    monitorId: string,
    userId: string,
    updates: {
      targetPersons?: string[];
      settings?: Partial<GroupMonitorSettings>;
      isActive?: boolean;
    }
  ): Promise<IGroupMonitor | null> {
    try {
      const monitor = await GroupMonitor.findOne({
        _id: new Types.ObjectId(monitorId),
        userId: new Types.ObjectId(userId)
      });

      if (!monitor) {
        throw new Error('Group monitor not found');
      }

      // Update target persons if provided
      if (updates.targetPersons) {
        const targetPersons = await PersonProfile.find({
          _id: { $in: updates.targetPersons.map(id => new Types.ObjectId(id)) },
          userId: new Types.ObjectId(userId),
          isActive: true
        });

        if (targetPersons.length !== updates.targetPersons.length) {
          throw new Error('Some target persons not found or do not belong to user');
        }

        monitor.targetPersons = targetPersons.map(p => p._id as mongoose.Types.ObjectId);
      }

      // Update settings if provided
      if (updates.settings) {
        monitor.settings = { ...monitor.settings, ...updates.settings };
      }

      // Update active status if provided
      if (updates.isActive !== undefined) {
        monitor.isActive = updates.isActive;
      }

      return await monitor.save();
    } catch (error) {
      console.error('Error updating group monitor:', error);
      throw new Error(`Failed to update group monitor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete group monitor
   */
  async deleteGroupMonitor(monitorId: string, userId: string): Promise<boolean> {
    try {
      const result = await GroupMonitor.deleteOne({
        _id: new Types.ObjectId(monitorId),
        userId: new Types.ObjectId(userId)
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting group monitor:', error);
      throw new Error('Failed to delete group monitor');
    }
  }

  /**
   * Process WhatsApp group message (image optional)
   */
  async processGroupMessage(
    messageId: string,
    groupId: string,
    senderId: string,
    senderName: string,
    imageUrl?: string,
    caption?: string
  ): Promise<void> {
    console.log(`[GroupMonitorService] 🔄 Processing message ${messageId} for group ${groupId}`, {
      senderId,
      senderName,
      hasImage: !!imageUrl,
      caption: caption?.substring(0, 100)
    });

    try {
      // Get active monitors for this group
      console.log(`[GroupMonitorService] 📊 Looking up active monitors for group: ${groupId}`);
      const monitors = await this.getActiveMonitorsForGroup(groupId);

      console.log(`[GroupMonitorService] 📊 Found ${monitors.length} active monitors for group ${groupId}:`,
        monitors.map(m => ({ id: m._id.toString(), groupName: m.groupName, userId: m.userId.toString() }))
      );

      if (monitors.length === 0) {
        console.log(`[GroupMonitorService] ⚠️ No active monitors found for group ${groupId} - skipping processing`);
        return; // No active monitors for this group
      }

      // Process message for each monitor
      for (const monitor of monitors) {
        console.log(`[GroupMonitorService] 🔧 Processing message for monitor ${monitor._id} (user: ${monitor.userId})`);

        try {
          // Always increment message count
          console.log(`[GroupMonitorService] 📈 Incrementing message count for monitor ${monitor._id}`);
          const beforeStats = { ...monitor.statistics };
          await (monitor as any).incrementStats('messages');

          // Reload monitor to see updated stats
          const updatedMonitor = await GroupMonitor.findById(monitor._id);
          console.log(`[GroupMonitorService] ✅ Message count updated for monitor ${monitor._id}:`, {
            before: beforeStats.totalMessages,
            after: updatedMonitor?.statistics.totalMessages,
            success: (updatedMonitor?.statistics.totalMessages || 0) > beforeStats.totalMessages
          });

          if (imageUrl) {
            console.log(`[GroupMonitorService] 📸 Processing image for monitor ${monitor._id}: ${imageUrl}`);

            // Increment image count and process for matches
            await (monitor as any).incrementStats('images');

            // Reload to check image stats update
            const updatedMonitorAfterImage = await GroupMonitor.findById(monitor._id);
            console.log(`[GroupMonitorService] ✅ Image count updated for monitor ${monitor._id}:`, {
              before: beforeStats.imagesProcessed,
              after: updatedMonitorAfterImage?.statistics.imagesProcessed,
              success: (updatedMonitorAfterImage?.statistics.imagesProcessed || 0) > beforeStats.imagesProcessed
            });

            await this.processImageForMonitor(
              monitor,
              messageId,
              senderId,
              senderName,
              imageUrl,
              caption
            );
          }
        } catch (error) {
          console.error(`[GroupMonitorService] ❌ Error processing message for monitor ${monitor._id}:`, error);
          // Continue with other monitors
        }
      }

      console.log(`[GroupMonitorService] ✅ Completed processing message ${messageId} for ${monitors.length} monitors`);
    } catch (error) {
      console.error(`[GroupMonitorService] ❌ Error processing group message ${messageId}:`, error);
    }
  }

  /**
   * Process image for a specific monitor
   */
  private async processImageForMonitor(
    monitor: IGroupMonitor,
    messageId: string,
    senderId: string,
    senderName: string,
    imageUrl: string,
    caption?: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get target person IDs for face matching
      const targetPersonIds = monitor.targetPersons.map(p => p.toString());

      // Call face recognition service
      const matchResult = await this.matchFacesInImage(imageUrl, targetPersonIds, monitor.settings.confidenceThreshold);

      if (!matchResult.success) {
        console.error('Face matching failed:', matchResult.error);
        return;
      }

      // Check if any target persons were detected
      const detectedPersons = this.extractDetectedPersons(matchResult, monitor);

      if (detectedPersons.length > 0) {
        // Update monitor statistics
        await (monitor as any).incrementStats('persons');

        // Create filtered image record
        const filteredImage = await this.createFilteredImageRecord(
          messageId,
          monitor,
          senderId,
          senderName,
          imageUrl,
          caption,
          detectedPersons,
          matchResult,
          Date.now() - startTime
        );

        // Send notification if enabled
        if (monitor.settings.notifyOnMatch) {
          this.sendMatchNotification(monitor, filteredImage, detectedPersons);
        }

        // Send auto-reply if enabled
        if (monitor.settings.autoReply && monitor.settings.replyMessage) {
          this.sendAutoReply(monitor.groupId, monitor.settings.replyMessage);
        }
      } else if (monitor.settings.saveAllImages) {
        // Save image even without matches if saveAllImages is enabled
        await this.createFilteredImageRecord(
          messageId,
          monitor,
          senderId,
          senderName,
          imageUrl,
          caption,
          [],
          matchResult,
          Date.now() - startTime
        );
      }
    } catch (error) {
      console.error('Error processing image for monitor:', error);
    }
  }

  /**
   * Match faces in image using face recognition service
   */
  private async matchFacesInImage(
    imageUrl: string,
    personIds: string[],
    confidenceThreshold: number
  ): Promise<ImageProcessingResult> {
    try {
      const response = await axios.post(
        `${this.faceRecognitionUrl}/api/face/match`,
        {
          image: imageUrl,
          personIds: personIds,
          confidenceThreshold: confidenceThreshold
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data as ImageProcessingResult;
    } catch (error) {
      console.error('Face recognition service error:', error);
      return {
        success: false,
        processingTime: 0,
        facesDetected: 0,
        imageDimensions: { width: 0, height: 0 },
        matches: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract detected persons from match results
   */
  private extractDetectedPersons(
    matchResult: ImageProcessingResult,
    monitor: IGroupMonitor
  ): any[] {
    const detectedPersons: any[] = [];

    for (const match of matchResult.matches) {
      for (const personMatch of match.matches) {
        if (personMatch.confidence >= monitor.settings.confidenceThreshold) {
          detectedPersons.push({
            personId: new Types.ObjectId(personMatch.personId),
            personName: personMatch.personName,
            confidence: personMatch.confidence,
            boundingBox: match.boundingBox
          });
        }
      }
    }

    return detectedPersons;
  }

  /**
   * Create filtered image record
   */
  private async createFilteredImageRecord(
    messageId: string,
    monitor: IGroupMonitor,
    senderId: string,
    senderName: string,
    imageUrl: string,
    caption: string | undefined,
    detectedPersons: any[],
    matchResult: ImageProcessingResult,
    processingTime: number
  ): Promise<IFilteredImage> {
    const filteredImage = new FilteredImage({
      messageId,
      groupId: monitor.groupId,
      groupName: monitor.groupName,
      userId: monitor.userId,
      senderId,
      senderName,
      imageUrl,
      originalCaption: caption,
      detectedPersons,
      processingDetails: {
        facesDetected: matchResult.facesDetected,
        processingTime,
        algorithm: 'face_recognition',
        status: 'processed'
      },
      metadata: {
        imageSize: 0, // Would need to fetch image to get actual size
        imageDimensions: matchResult.imageDimensions,
        mimeType: 'image/jpeg' // Default, would need to detect actual type
      },
      isNotified: false,
      isArchived: false,
      tags: []
    });

    return await filteredImage.save();
  }

  /**
   * Send notification about person match
   */
  private sendMatchNotification(
    monitor: IGroupMonitor,
    filteredImage: IFilteredImage,
    detectedPersons: any[]
  ): void {
    // TODO: Implement notification system (WebSocket, push notification, etc.)
    const personNames = detectedPersons.map(p => p.personName).join(', ');
    console.log(`🔔 Person match notification: ${personNames} detected in ${monitor.groupName}`);
    
    // Mark as notified
    (filteredImage as any).markAsNotified().catch((error: any) => {
      console.error('Error marking notification as sent:', error);
    });
  }

  /**
   * Send auto-reply to WhatsApp group
   */
  private async sendAutoReply(groupId: string, replyMessage: string): Promise<void> {
    try {
      await this.wahaService.sendMessage(groupId, replyMessage);
      console.log(`📱 Auto-reply sent to group ${groupId}: ${replyMessage}`);
    } catch (error) {
      console.error('Error sending auto-reply:', error);
    }
  }

  /**
   * Get filtered images for user
   */
  async getFilteredImages(
    userId: string,
    options: {
      personId?: string;
      groupId?: string;
      archived?: boolean;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<IFilteredImage[]> {
    try {
      return await (FilteredImage as any).getImagesForUser(userId, options);
    } catch (error) {
      console.error('Error fetching filtered images:', error);
      throw new Error('Failed to fetch filtered images');
    }
  }

  /**
   * Get monitor statistics
   */
  async getMonitorStatistics(monitorId: string, userId: string): Promise<any> {
    console.log(`[GroupMonitorService] 📊 Fetching statistics for monitor ${monitorId} (user: ${userId})`);

    try {
      const monitor = await GroupMonitor.findOne({
        _id: new Types.ObjectId(monitorId),
        userId: new Types.ObjectId(userId)
      });

      if (!monitor) {
        console.error(`[GroupMonitorService] ❌ Monitor not found: ${monitorId} for user ${userId}`);
        throw new Error('Monitor not found');
      }

      console.log(`[GroupMonitorService] 📊 Found monitor ${monitorId}:`, {
        groupId: monitor.groupId,
        groupName: monitor.groupName,
        isActive: monitor.isActive,
        statistics: monitor.statistics
      });

      const filteredImageCount = await FilteredImage.countDocuments({
        groupId: monitor.groupId,
        userId: new Types.ObjectId(userId)
      });

      console.log(`[GroupMonitorService] 📊 Filtered images count for group ${monitor.groupId}: ${filteredImageCount}`);

      const result = {
        ...monitor.statistics,
        filteredImages: filteredImageCount,
        monitorId: monitor._id,
        groupName: monitor.groupName,
        groupId: monitor.groupId,
        isActive: monitor.isActive,
        lastUpdated: new Date().toISOString()
      };

      console.log(`[GroupMonitorService] ✅ Returning statistics for monitor ${monitorId}:`, result);

      return result;
    } catch (error) {
      console.error(`[GroupMonitorService] ❌ Error fetching monitor statistics for ${monitorId}:`, error);
      throw new Error('Failed to fetch monitor statistics');
    }
  }
}

export default GroupMonitorService;
import { Request, Response } from 'express';
import PersonProfileService from '../../services/personProfileService';
import GroupMonitorService from '../../services/groupMonitorService';
import FilteredImage from '../../models/FilteredImage';
import { AuthRequest } from '../../types/express';

class GroupMonitorController {
  private personProfileService: PersonProfileService;
  private groupMonitorService: GroupMonitorService;

  constructor() {
    this.personProfileService = new PersonProfileService();
    this.groupMonitorService = new GroupMonitorService();
  }

  // Person Profile endpoints
  async createPersonProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { name, description, trainingImages } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({
          success: false,
          error: 'Person name is required'
        });
        return;
      }

      if (!trainingImages || !Array.isArray(trainingImages) || trainingImages.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one training image is required'
        });
        return;
      }

      const personProfile = await this.personProfileService.createPersonProfile(userId, {
        name: name.trim(),
        description: description?.trim(),
        trainingImages
      });

      res.status(201).json({
        success: true,
        data: personProfile,
        message: 'Person profile created successfully'
      });
    } catch (error) {
      console.error('Error creating person profile:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create person profile'
      });
    }
  }

  async getPersonProfiles(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const profiles = await this.personProfileService.getPersonProfilesByUser(userId);

      res.json({
        success: true,
        data: profiles
      });
    } catch (error) {
      console.error('Error fetching person profiles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch person profiles'
      });
    }
  }

  async getPersonProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const profile = await this.personProfileService.getPersonProfileById(id, userId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Person profile not found'
        });
        return;
      }

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Error fetching person profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch person profile'
      });
    }
  }

  async updatePersonProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const updates = req.body;

      const updatedProfile = await this.personProfileService.updatePersonProfile(id, userId, updates);

      if (!updatedProfile) {
        res.status(404).json({
          success: false,
          error: 'Person profile not found'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedProfile,
        message: 'Person profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating person profile:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update person profile'
      });
    }
  }

  async deletePersonProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const deleted = await this.personProfileService.deletePersonProfile(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Person profile not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Person profile deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting person profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete person profile'
      });
    }
  }

  async addTrainingImages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const { trainingImages } = req.body;

      if (!trainingImages || !Array.isArray(trainingImages) || trainingImages.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Training images are required'
        });
        return;
      }

      const updatedProfile = await this.personProfileService.addTrainingImages(id, userId, trainingImages);

      if (!updatedProfile) {
        res.status(404).json({
          success: false,
          error: 'Person profile not found'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedProfile,
        message: 'Training images added successfully'
      });
    } catch (error) {
      console.error('Error adding training images:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add training images'
      });
    }
  }

  // Group Monitor endpoints
  async createGroupMonitor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { groupId, groupName, targetPersons, settings } = req.body;

      if (!groupId || !groupName) {
        res.status(400).json({
          success: false,
          error: 'Group ID and name are required'
        });
        return;
      }

      if (!targetPersons || !Array.isArray(targetPersons) || targetPersons.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one target person is required'
        });
        return;
      }

      const monitor = await this.groupMonitorService.createGroupMonitor(userId, {
        groupId,
        groupName,
        targetPersons,
        settings
      });

      res.status(201).json({
        success: true,
        data: monitor,
        message: 'Group monitor created successfully'
      });
    } catch (error) {
      console.error('Error creating group monitor:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create group monitor'
      });
    }
  }

  async getGroupMonitors(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const monitors = await this.groupMonitorService.getGroupMonitorsByUser(userId);

      res.json({
        success: true,
        data: monitors
      });
    } catch (error) {
      console.error('Error fetching group monitors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch group monitors'
      });
    }
  }

  async updateGroupMonitor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const updates = req.body;

      const updatedMonitor = await this.groupMonitorService.updateGroupMonitor(id, userId, updates);

      if (!updatedMonitor) {
        res.status(404).json({
          success: false,
          error: 'Group monitor not found'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedMonitor,
        message: 'Group monitor updated successfully'
      });
    } catch (error) {
      console.error('Error updating group monitor:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update group monitor'
      });
    }
  }

  async deleteGroupMonitor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const deleted = await this.groupMonitorService.deleteGroupMonitor(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Group monitor not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Group monitor deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting group monitor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete group monitor'
      });
    }
  }

  async getMonitorStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const statistics = await this.groupMonitorService.getMonitorStatistics(id, userId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error fetching monitor statistics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch monitor statistics'
      });
    }
  }

  // Filtered Images endpoints
  async getFilteredImages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { personId, groupId, archived, limit, skip } = req.query;

      const options: any = {
        limit: limit ? parseInt(limit as string) : 50,
        skip: skip ? parseInt(skip as string) : 0
      };

      if (personId) options.personId = personId as string;
      if (groupId) options.groupId = groupId as string;
      if (archived !== undefined) options.archived = archived === 'true';

      const images = await this.groupMonitorService.getFilteredImages(userId, options);

      res.json({
        success: true,
        data: images
      });
    } catch (error) {
      console.error('Error fetching filtered images:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch filtered images'
      });
    }
  }

  async archiveFilteredImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;

      const image = await FilteredImage.findOne({
        _id: id,
        userId: userId
      });

      if (!image) {
        res.status(404).json({
          success: false,
          error: 'Filtered image not found'
        });
        return;
      }

      await image.archive();

      res.json({
        success: true,
        message: 'Image archived successfully'
      });
    } catch (error) {
      console.error('Error archiving filtered image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to archive image'
      });
    }
  }

  async addImageTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id } = req.params;
      const { tag } = req.body;

      if (!tag || !tag.trim()) {
        res.status(400).json({
          success: false,
          error: 'Tag is required'
        });
        return;
      }

      const image = await FilteredImage.findOne({
        _id: id,
        userId: userId
      });

      if (!image) {
        res.status(404).json({
          success: false,
          error: 'Filtered image not found'
        });
        return;
      }

      await image.addTag(tag.trim());

      res.json({
        success: true,
        message: 'Tag added successfully'
      });
    } catch (error) {
      console.error('Error adding image tag:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add tag'
      });
    }
  }

  // Health check and service status
  async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const faceRecognitionHealthy = await this.personProfileService.testFaceRecognitionService();

      res.json({
        success: true,
        data: {
          faceRecognitionService: faceRecognitionHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error checking service status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check service status'
      });
    }
  }

  // Webhook for processing WhatsApp messages
  async processWhatsAppMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId, groupId, senderId, senderName, imageUrl, caption, text, urls } = req.body;

      const messageText = text || req.body?.message || caption;
      const normalizedUrls = Array.isArray(urls)
        ? urls
        : typeof urls === 'string'
          ? [urls]
          : Array.isArray(req.body?.links)
            ? req.body.links
            : undefined;

      console.log(`[GroupMonitor Webhook] 📥 Received message:`, {
        messageId,
        groupId,
        senderId,
        senderName,
        hasImage: !!imageUrl,
        caption: caption?.substring(0, 50) + (caption?.length > 50 ? '...' : ''),
        text: messageText?.substring(0, 50) + (messageText && messageText.length > 50 ? '...' : ''),
        urlCount: normalizedUrls?.length || 0,
        fullPayload: JSON.stringify(req.body)
      });

      if (!messageId || !groupId || !senderId) {
        console.error(`[GroupMonitor Webhook] ❌ Missing required fields:`, {
          messageId: !!messageId,
          groupId: !!groupId,
          senderId: !!senderId
        });
        res.status(400).json({
          success: false,
          error: 'Missing required message data'
        });
        return;
      }

      // Process the message in the background
      console.log(`[GroupMonitor Webhook] 🔄 Starting background processing for groupId: ${groupId}`);
      this.groupMonitorService.processGroupMessage(
        messageId,
        groupId,
        senderId,
        senderName || 'Unknown',
        {
          imageUrl,
          caption,
          text: messageText,
          urls: normalizedUrls,
        }
      ).then(() => {
        console.log(`[GroupMonitor Webhook] ✅ Successfully processed message ${messageId} for group ${groupId}`);
      }).catch(error => {
        console.error(`[GroupMonitor Webhook] ❌ Background processing failed for message ${messageId}:`, error);
      });

      res.json({
        success: true,
        message: 'Message processing initiated'
      });
    } catch (error) {
      console.error('[GroupMonitor Webhook] ❌ Error processing WhatsApp message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  }

  // Test endpoint to simulate WhatsApp message (for debugging)
  async testWebhookMessage(req: Request, res: Response): Promise<void> {
    try {
      const testMessage = {
        messageId: `test_${Date.now()}`,
        groupId: req.body.groupId || 'test-group@g.us',
        senderId: req.body.senderId || 'test-sender@s.whatsapp.net',
        senderName: req.body.senderName || 'Test Sender',
        imageUrl: req.body.imageUrl,
        caption: req.body.caption || 'Test message for group monitoring',
        text: req.body.text,
        urls: Array.isArray(req.body.urls) ? req.body.urls : undefined,
      };

      console.log(`[GroupMonitor Test] 🧪 Simulating webhook message:`, testMessage);

      // Process like a real webhook would
      this.groupMonitorService.processGroupMessage(
        testMessage.messageId,
        testMessage.groupId,
        testMessage.senderId,
        testMessage.senderName,
        {
          imageUrl: testMessage.imageUrl,
          caption: testMessage.caption,
          text: testMessage.text,
          urls: testMessage.urls,
        }
      ).then(() => {
        console.log(`[GroupMonitor Test] ✅ Test message processed successfully`);
      }).catch(error => {
        console.error(`[GroupMonitor Test] ❌ Test message processing failed:`, error);
      });

      res.json({
        success: true,
        message: 'Test message processing initiated',
        testMessage
      });
    } catch (error) {
      console.error('[GroupMonitor Test] ❌ Error processing test message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process test message'
      });
    }
  }
}

export default GroupMonitorController;

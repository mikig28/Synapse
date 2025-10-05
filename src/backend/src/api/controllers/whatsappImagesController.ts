/**
 * WhatsApp Images Controller
 * Handles on-demand image extraction from WhatsApp messages
 */
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import WhatsAppImageService from '../../services/whatsappImageService';
import { whatsappImageGridFSService } from '../../services/whatsappImageGridFSService';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import WhatsAppImage from '../../models/WhatsAppImage';
import GroupMonitor from '../../models/GroupMonitor';
import fs from 'fs/promises';
import path from 'path';

// Get WhatsApp Image service instance
const getImageService = () => {
  return WhatsAppImageService.getInstance();
};

/**
 * Extract image from WhatsApp message on-demand
 */
export const extractImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId, chatId, chatName, senderId, senderName, caption, isGroup } = req.body;
    
    // Get user ID from authenticated request
    const userId = req.user?.id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!messageId || !chatId || !senderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: messageId, chatId, and senderId are required'
      });
    }

    console.log(`[WhatsApp Images] Extract request for message ${messageId} by user ${userId}`);

    const imageService = getImageService();
    
    // Initialize service if not already initialized
    if (!imageService.isReady()) {
      await imageService.initialize();
    }

    const result = await imageService.extractImageOnDemand({
      messageId,
      chatId,
      chatName,
      senderId,
      senderName,
      caption,
      isGroup: Boolean(isGroup),
      userId
    });

    if (result.success) {
      console.log(`[WhatsApp Images] ✅ Successfully extracted image for message ${messageId}`);
      
      // Update group monitor statistics if this is from a monitored group
      // Only increment if this is a NEW extraction (not already exists)
      if (isGroup && chatId && !result.alreadyExists) {
        try {
          const monitors = await GroupMonitor.find({
            groupId: chatId,
            userId: userId,
            isActive: true
          });

          if (monitors.length > 0) {
            console.log(`[WhatsApp Images] Updating statistics for ${monitors.length} group monitor(s)`);
            
            for (const monitor of monitors) {
              await (monitor as any).incrementStats('images');
              console.log(`[WhatsApp Images] ✅ Incremented image counter for monitor ${monitor._id}`);
            }
          }
        } catch (error) {
          console.error('[WhatsApp Images] ⚠️ Failed to update group monitor statistics:', error);
          // Don't fail the request if stats update fails
        }
      }
      
      res.json({
        success: true,
        data: {
          ...result.image?.toObject(),
          alreadyExists: result.alreadyExists || false
        }
      });
    } else {
      console.error(`[WhatsApp Images] ❌ Failed to extract image: ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to extract image'
      });
    }
  } catch (error: any) {
    console.error('[WhatsApp Images] Error in extract image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during image extraction'
    });
  }
};

/**
 * Get user's extracted WhatsApp images with filters
 */
export const getUserImages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const {
      chatId,
      senderId,
      isGroup,
      bookmarked,
      archived,
      search,
      limit,
      skip
    } = req.query;

    const options = {
      chatId: chatId as string,
      senderId: senderId as string,
      isGroup: isGroup === 'true' ? true : isGroup === 'false' ? false : undefined,
      bookmarked: bookmarked === 'true' ? true : bookmarked === 'false' ? false : undefined,
      archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined
    };

    const imageService = getImageService();
    const images = await imageService.getUserImages(userId, options);

    console.log(`[WhatsApp Images] Retrieved ${images.length} images for user ${userId}`);

    res.json({
      success: true,
      data: images,
      pagination: {
        limit: options.limit || 50,
        skip: options.skip || 0,
        total: images.length
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp Images] Error getting user images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve images'
    });
  }
};

/**
 * Get specific image by message ID
 */
export const getImageByMessageId = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id?.toString();
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    const imageService = getImageService();
    const image = await imageService.getImageByMessageId(messageId, userId);

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error: any) {
    console.error('[WhatsApp Images] Error getting image by message ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve image'
    });
  }
};

/**
 * Serve image file
 * PRIORITY: Serve from GridFS for permanent storage (works on mobile/desktop)
 */
export const serveImageFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id?.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    // FIRST: Check WhatsAppImage table (extracted images with Puppeteer)
    const extractedImage = await WhatsAppImage.findOne({ messageId, userId });

    if (extractedImage && extractedImage.localPath?.startsWith('gridfs://')) {
      console.log(`[WhatsApp Images] Serving extracted image from GridFS: ${messageId}`);

      const gridfsId = whatsappImageGridFSService.extractGridFSId(extractedImage.localPath);
      if (gridfsId) {
        const result = await whatsappImageGridFSService.getImageStream(gridfsId);

        if (result) {
          // Set appropriate headers for GridFS image
          res.setHeader('Content-Type', result.metadata.contentType || extractedImage.mimeType || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year (permanent)
          res.setHeader('Content-Length', result.metadata.length);

          if (extractedImage.filename) {
            res.setHeader('Content-Disposition', `inline; filename="${extractedImage.filename}"`);
          }

          // Stream the image from GridFS
          return result.stream.pipe(res);
        }
      }
    }

    // SECOND: Check WhatsAppMessage table (auto-saved messages)
    const message = await WhatsAppMessage.findOne({ messageId });

    if (message && message.localPath?.startsWith('gridfs://')) {
      console.log(`[WhatsApp Images] Serving message image from GridFS: ${messageId}`);

      const gridfsId = whatsappImageGridFSService.extractGridFSId(message.localPath);
      if (gridfsId) {
        const result = await whatsappImageGridFSService.getImageStream(gridfsId);

        if (result) {
          // Set appropriate headers for GridFS image
          res.setHeader('Content-Type', result.metadata.contentType || message.mimeType || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year (permanent)
          res.setHeader('Content-Length', result.metadata.length);

          if (message.filename) {
            res.setHeader('Content-Disposition', `inline; filename="${message.filename}"`);
          }

          // Stream the image from GridFS
          return result.stream.pipe(res);
        }
      }
    }

    // FALLBACK: Get image through service (handles both GridFS and local storage)
    console.log(`[WhatsApp Images] Primary GridFS lookup failed, trying service layer: ${messageId}`);
    const imageService = getImageService();
    const imageFile = await imageService.getImageFile(messageId, userId);

    if (!imageFile) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found'
      });
    }

    // Check if service returned a GridFS path
    if (imageFile.isGridFS && imageFile.path.startsWith('gridfs://')) {
      console.log(`[WhatsApp Images] Service returned GridFS path, extracting from GridFS: ${imageFile.path}`);

      const gridfsId = whatsappImageGridFSService.extractGridFSId(imageFile.path);
      if (gridfsId) {
        const result = await whatsappImageGridFSService.getImageStream(gridfsId);

        if (result) {
          // Set appropriate headers for GridFS image
          res.setHeader('Content-Type', result.metadata.contentType || imageFile.mimeType || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year (permanent)
          res.setHeader('Content-Length', result.metadata.length);

          // Stream the image from GridFS
          return result.stream.pipe(res);
        }
      }

      // If GridFS extraction failed, return error
      return res.status(404).json({
        success: false,
        error: 'Failed to retrieve image from GridFS'
      });
    }

    // Serve from local file storage (legacy behavior)
    console.log(`[WhatsApp Images] Serving from local file storage: ${imageFile.path}`);
    res.setHeader('Content-Type', imageFile.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Stream the file
    res.sendFile(path.resolve(imageFile.path));
  } catch (error: any) {
    console.error('[WhatsApp Images] Error serving image file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve image file'
    });
  }
};

/**
 * Update image (bookmark, archive, tags)
 */
export const updateImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id?.toString();
    const { bookmark, archive, addTags, removeTags } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    const imageService = getImageService();
    const updatedImage = await imageService.updateImage(messageId, userId, {
      bookmark,
      archive,
      addTags: addTags ? (Array.isArray(addTags) ? addTags : [addTags]) : undefined,
      removeTags: removeTags ? (Array.isArray(removeTags) ? removeTags : [removeTags]) : undefined
    });

    if (!updatedImage) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    res.json({
      success: true,
      data: updatedImage
    });
  } catch (error: any) {
    console.error('[WhatsApp Images] Error updating image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update image'
    });
  }
};

/**
 * Delete extracted image
 */
export const deleteImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id?.toString();
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    const imageService = getImageService();
    const deleted = await imageService.deleteImage(messageId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error: any) {
    console.error('[WhatsApp Images] Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image'
    });
  }
};

/**
 * Get extraction statistics for user
 */
export const getExtractionStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id?.toString();
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const imageService = getImageService();
    const stats = await imageService.getExtractionStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[WhatsApp Images] Error getting extraction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
};

/**
 * Check extraction status (if image is already extracted)
 */
export const checkExtractionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id?.toString();
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    const imageService = getImageService();
    const image = await imageService.getImageByMessageId(messageId, userId);

    res.json({
      success: true,
      data: {
        messageId,
        isExtracted: !!image,
        status: image?.status || 'not_extracted',
        extractedAt: image?.extractedAt || null,
        publicUrl: image?.getPublicUrl() || null
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp Images] Error checking extraction status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check extraction status'
    });
  }
};

/**
 * Initialize image extraction service
 */
export const initializeService = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Images] Service initialization request received');
    
    const imageService = getImageService();
    
    if (imageService.isReady()) {
      return res.json({
        success: true,
        message: 'Image extraction service is already initialized',
        ready: true
      });
    }

    await imageService.initialize();
    
    res.json({
      success: true,
      message: 'Image extraction service initialized successfully',
      ready: true
    });
  } catch (error: any) {
    console.error('[WhatsApp Images] Error initializing service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize image extraction service',
      details: error.message
    });
  }
};

/**
 * Health check for image extraction service
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const imageService = getImageService();
    const isReady = imageService.isReady();
    
    res.json({
      success: true,
      data: {
        ready: isReady,
        service: 'whatsapp-image-extraction',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[WhatsApp Images] Error in health check:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
};

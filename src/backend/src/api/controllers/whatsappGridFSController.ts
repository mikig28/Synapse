/**
 * WhatsApp GridFS Controller
 * Handles serving WhatsApp images from MongoDB GridFS
 */

import { Request, Response } from 'express';
import { whatsappImageGridFSService } from '../../services/whatsappImageGridFSService';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import { ObjectId } from 'mongodb';

/**
 * Serve WhatsApp image from GridFS by message ID
 * GET /api/v1/whatsapp-gridfs/image/:messageId
 */
export const serveImageByMessageId = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    // Find message in database
    const message = await WhatsAppMessage.findOne({ messageId });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if image is stored in GridFS
    if (!message.localPath?.startsWith('gridfs://')) {
      return res.status(404).json({
        success: false,
        error: 'Image not stored in GridFS'
      });
    }

    // Extract GridFS ID from localPath
    const gridfsId = whatsappImageGridFSService.extractGridFSId(message.localPath);
    if (!gridfsId) {
      return res.status(500).json({
        success: false,
        error: 'Invalid GridFS reference'
      });
    }

    // Get image stream from GridFS
    const result = await whatsappImageGridFSService.getImageStream(gridfsId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found in GridFS'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', result.metadata.contentType || message.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Content-Length', result.metadata.length);
    
    if (message.filename) {
      res.setHeader('Content-Disposition', `inline; filename="${message.filename}"`);
    }

    // Stream the image
    result.stream.pipe(res);

  } catch (error: any) {
    console.error('[WhatsApp GridFS Controller] Error serving image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Serve WhatsApp image from GridFS by GridFS ID
 * GET /api/v1/whatsapp-gridfs/file/:gridfsId
 */
export const serveImageByGridFSId = async (req: Request, res: Response) => {
  try {
    const { gridfsId } = req.params;

    if (!gridfsId) {
      return res.status(400).json({
        success: false,
        error: 'GridFS ID is required'
      });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(gridfsId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GridFS ID format'
      });
    }

    // Get image stream from GridFS
    const result = await whatsappImageGridFSService.getImageStream(gridfsId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found in GridFS'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', result.metadata.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Content-Length', result.metadata.length);
    
    if (result.metadata.filename) {
      res.setHeader('Content-Disposition', `inline; filename="${result.metadata.filename}"`);
    }

    // Stream the image
    result.stream.pipe(res);

  } catch (error: any) {
    console.error('[WhatsApp GridFS Controller] Error serving image by GridFS ID:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get image metadata from GridFS
 * GET /api/v1/whatsapp-gridfs/metadata/:messageId
 */
export const getImageMetadata = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    // Find message in database
    const message = await WhatsAppMessage.findOne({ messageId });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Check if image is stored in GridFS
    if (!message.localPath?.startsWith('gridfs://')) {
      return res.status(200).json({
        success: true,
        data: {
          messageId,
          isGridFS: false,
          hasMediaUrl: !!message.mediaUrl,
          downloadStatus: message.downloadStatus
        }
      });
    }

    // Extract GridFS ID
    const gridfsId = whatsappImageGridFSService.extractGridFSId(message.localPath);
    if (!gridfsId) {
      return res.status(500).json({
        success: false,
        error: 'Invalid GridFS reference'
      });
    }

    // Get GridFS metadata
    const result = await whatsappImageGridFSService.getImageStream(gridfsId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Image file not found in GridFS'
      });
    }

    res.json({
      success: true,
      data: {
        messageId,
        gridfsId: gridfsId.toString(),
        isGridFS: true,
        filename: result.metadata.filename,
        contentType: result.metadata.contentType,
        size: result.metadata.length,
        uploadDate: result.metadata.uploadDate,
        metadata: result.metadata.metadata
      }
    });

  } catch (error: any) {
    console.error('[WhatsApp GridFS Controller] Error getting metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Check GridFS storage status for a message
 * GET /api/v1/whatsapp-gridfs/status/:messageId
 */
export const checkGridFSStatus = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required'
      });
    }

    // Find message in database
    const message = await WhatsAppMessage.findOne({ messageId });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const hasGridFS = whatsappImageGridFSService.hasGridFSStorage(message);

    res.json({
      success: true,
      data: {
        messageId,
        hasGridFS,
        localPath: message.localPath || null,
        downloadStatus: message.downloadStatus,
        mimeType: message.mimeType,
        fileSize: message.fileSize,
        gridfsUrl: hasGridFS ? `/api/v1/whatsapp-gridfs/image/${messageId}` : null
      }
    });

  } catch (error: any) {
    console.error('[WhatsApp GridFS Controller] Error checking GridFS status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

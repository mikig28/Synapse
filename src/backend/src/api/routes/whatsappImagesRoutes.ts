/**
 * WhatsApp Images Routes
 * API endpoints for on-demand image extraction from WhatsApp messages
 */

import express from 'express';
import * as whatsappImagesController from '../controllers/whatsappImagesController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @route   POST /api/v1/whatsapp/images/extract
 * @desc    Extract image from WhatsApp message on-demand
 * @access  Private
 * @body    { messageId, chatId, chatName?, senderId, senderName?, caption?, isGroup? }
 */
router.post('/extract', whatsappImagesController.extractImage);

/**
 * @route   GET /api/v1/whatsapp/images
 * @desc    Get user's extracted WhatsApp images with optional filters
 * @access  Private
 * @query   chatId?, senderId?, isGroup?, bookmarked?, archived?, search?, limit?, skip?
 */
router.get('/', whatsappImagesController.getUserImages);

/**
 * @route   GET /api/v1/whatsapp/images/stats
 * @desc    Get extraction statistics for the user
 * @access  Private
 */
router.get('/stats', whatsappImagesController.getExtractionStats);

/**
 * @route   GET /api/v1/whatsapp/images/:messageId
 * @desc    Get specific image by message ID
 * @access  Private
 * @params  messageId - WhatsApp message ID
 */
router.get('/:messageId', whatsappImagesController.getImageByMessageId);

/**
 * @route   GET /api/v1/whatsapp/images/:messageId/file
 * @desc    Serve image file
 * @access  Private
 * @params  messageId - WhatsApp message ID
 */
router.get('/:messageId/file', whatsappImagesController.serveImageFile);

/**
 * @route   GET /api/v1/whatsapp/images/:messageId/status
 * @desc    Check extraction status of a message
 * @access  Private
 * @params  messageId - WhatsApp message ID
 */
router.get('/:messageId/status', whatsappImagesController.checkExtractionStatus);

/**
 * @route   PUT /api/v1/whatsapp/images/:messageId
 * @desc    Update image (bookmark, archive, tags)
 * @access  Private
 * @params  messageId - WhatsApp message ID
 * @body    { bookmark?, archive?, addTags?, removeTags? }
 */
router.put('/:messageId', whatsappImagesController.updateImage);

/**
 * @route   DELETE /api/v1/whatsapp/images/:messageId
 * @desc    Delete extracted image
 * @access  Private
 * @params  messageId - WhatsApp message ID
 */
router.delete('/:messageId', whatsappImagesController.deleteImage);

/**
 * @route   POST /api/v1/whatsapp/images/service/initialize
 * @desc    Initialize image extraction service
 * @access  Private
 */
router.post('/service/initialize', whatsappImagesController.initializeService);

/**
 * @route   GET /api/v1/whatsapp/images/service/health
 * @desc    Health check for image extraction service
 * @access  Private
 */
router.get('/service/health', whatsappImagesController.healthCheck);

export default router;
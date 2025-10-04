/**
 * WhatsApp GridFS Routes
 * Routes for serving WhatsApp images from MongoDB GridFS
 */

import { Router } from 'express';
import * as whatsappGridFSController from '../controllers/whatsappGridFSController';

const router = Router();

/**
 * GET /api/v1/whatsapp-gridfs/image/:messageId
 * Serve WhatsApp image from GridFS by message ID
 */
router.get('/image/:messageId', whatsappGridFSController.serveImageByMessageId);

/**
 * GET /api/v1/whatsapp-gridfs/file/:gridfsId
 * Serve WhatsApp image from GridFS by GridFS ID
 */
router.get('/file/:gridfsId', whatsappGridFSController.serveImageByGridFSId);

/**
 * GET /api/v1/whatsapp-gridfs/metadata/:messageId
 * Get image metadata from GridFS
 */
router.get('/metadata/:messageId', whatsappGridFSController.getImageMetadata);

/**
 * GET /api/v1/whatsapp-gridfs/status/:messageId
 * Check GridFS storage status for a message
 */
router.get('/status/:messageId', whatsappGridFSController.checkGridFSStatus);

export default router;

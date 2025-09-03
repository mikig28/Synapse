"use strict";
/**
 * WhatsApp Images Routes
 * API endpoints for on-demand image extraction from WhatsApp messages
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const whatsappImagesController = __importStar(require("../controllers/whatsappImagesController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.protect);
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
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const documentsController_1 = require("../controllers/documentsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All routes require authentication
router.use(authMiddleware_1.protect);
// Document CRUD operations
router.get('/', documentsController_1.getDocuments);
router.post('/', documentsController_1.createDocument);
// Test endpoint for debugging
router.post('/test-upload', (req, res) => {
    console.log('[test-upload] Test endpoint hit');
    console.log('[test-upload] User:', req.user);
    console.log('[test-upload] Body:', req.body);
    console.log('[test-upload] Headers:', req.headers);
    res.json({ success: true, message: 'Test endpoint working', user: req.user });
});
// Simplified upload for debugging
router.post('/upload-simple', documentsController_1.upload.single('file'), documentsController_1.uploadDocumentSimple);
router.post('/upload', documentsController_1.upload.single('file'), documentsController_1.uploadDocument);
router.get('/stats', documentsController_1.getDocumentStats);
router.get('/health', documentsController_1.getHealthStatus);
router.get('/:id/download', documentsController_1.downloadDocument);
router.get('/:id', documentsController_1.getDocument);
router.put('/:id', documentsController_1.updateDocument);
router.delete('/:id', documentsController_1.deleteDocument);
// Document processing and search
router.post('/search', documentsController_1.searchDocuments);
router.get('/:id/processing-status', documentsController_1.getProcessingStatus);
router.get('/:id/similar', documentsController_1.getSimilarDocuments);
exports.default = router;

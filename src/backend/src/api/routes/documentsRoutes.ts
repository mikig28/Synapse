import express from 'express';
import {
  getDocuments,
  getDocument,
  uploadDocument,
  uploadDocumentSimple,
  createDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  getProcessingStatus,
  getSimilarDocuments,
  getDocumentStats,
  upload,
} from '../controllers/documentsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Document CRUD operations
router.get('/', getDocuments as any);
router.post('/', createDocument as any);

// Test endpoint for debugging
router.post('/test-upload', (req: any, res: any) => {
  console.log('[test-upload] Test endpoint hit');
  console.log('[test-upload] User:', req.user);
  console.log('[test-upload] Body:', req.body);
  console.log('[test-upload] Headers:', req.headers);
  res.json({ success: true, message: 'Test endpoint working', user: req.user });
});

// Simplified upload for debugging
router.post('/upload-simple', upload.single('file'), uploadDocumentSimple as any);

router.post('/upload', upload.single('file'), uploadDocumentSimple as any);
router.get('/stats', getDocumentStats as any);
router.get('/:id', getDocument as any);
router.put('/:id', updateDocument as any);
router.delete('/:id', deleteDocument as any);

// Document processing and search
router.post('/search', searchDocuments as any);
router.get('/:id/processing-status', getProcessingStatus as any);
router.get('/:id/similar', getSimilarDocuments as any);

export default router;
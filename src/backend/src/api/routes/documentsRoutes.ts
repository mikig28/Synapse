import express from 'express';
import {
  getDocuments,
  getDocument,
  uploadDocument,
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
router.get('/', getDocuments);
router.post('/', createDocument);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/stats', getDocumentStats);
router.get('/:id', getDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// Document processing and search
router.post('/search', searchDocuments);
router.get('/:id/processing-status', getProcessingStatus);
router.get('/:id/similar', getSimilarDocuments);

export default router;
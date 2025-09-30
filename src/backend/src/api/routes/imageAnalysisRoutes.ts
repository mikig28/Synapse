import { Router } from 'express';
import { 
  getImageCategories,
  getImageStats,
  reanalyzeImage,
  bulkAnalyzeImages
} from '../controllers/imageAnalysisController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/categories', getImageCategories);

// Protected routes - require authentication
router.get('/stats', authenticateToken, getImageStats);
router.post('/reanalyze/:itemId', authenticateToken, reanalyzeImage);
router.post('/bulk-analyze', authenticateToken, bulkAnalyzeImages);

export default router;


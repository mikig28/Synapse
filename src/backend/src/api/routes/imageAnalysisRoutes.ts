import { Router } from 'express';
import { 
  getImageCategories,
  getImageStats,
  reanalyzeImage,
  bulkAnalyzeImages
} from '../controllers/imageAnalysisController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/categories', getImageCategories);

// Protected routes - require authentication
router.get('/stats', protect, getImageStats);
router.post('/reanalyze/:itemId', protect, reanalyzeImage);
router.post('/bulk-analyze', protect, bulkAnalyzeImages);

export default router;



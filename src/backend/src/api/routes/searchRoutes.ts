import express from 'express';
import {
  universalSearch,
  getSearchSuggestions,
  getSearchStats
} from '../controllers/searchController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Protect all routes
router.use(protect);

// Universal search across all content types
router.post('/universal', universalSearch as any);

// Get search suggestions
router.get('/suggestions', getSearchSuggestions as any);

// Get search statistics
router.get('/stats', getSearchStats as any);

export default router;
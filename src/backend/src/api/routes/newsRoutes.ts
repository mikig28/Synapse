import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getNewsItems,
  getNewsItemById,
  markAsRead,
  toggleFavorite,
  deleteNewsItem,
  archiveNewsItem,
  getNewsCategories,
  getNewsStatistics,
  bulkMarkAsRead,
  enhanceNewsWithImage,
  enhanceRecentNews,
  getImageStats,
  generateTestImage,
} from '../controllers/newsController';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// News item operations
router.get('/', getNewsItems);
router.get('/categories', getNewsCategories);
router.get('/statistics', getNewsStatistics);
router.post('/bulk/mark-read', bulkMarkAsRead);

router.get('/:newsId', getNewsItemById);
router.delete('/:newsId', deleteNewsItem);

// News item actions
router.post('/:newsId/read', markAsRead);
router.post('/:newsId/favorite', toggleFavorite);
router.post('/:newsId/archive', archiveNewsItem);

// Image enhancement endpoints
router.post('/:newsId/enhance-image', enhanceNewsWithImage);
router.post('/enhance/recent', enhanceRecentNews);
router.get('/images/stats', getImageStats);
router.post('/images/test', generateTestImage);

export default router;
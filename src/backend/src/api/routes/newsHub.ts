import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import * as newsHubController from '../controllers/newsHubController';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// News feed routes
router.get('/feed', newsHubController.getNewsFeed);
router.post('/refresh', newsHubController.refreshNews);
router.get('/stats', newsHubController.getNewsHubStats);

// User interests routes
router.get('/interests', newsHubController.getUserInterests);
router.post('/interests', newsHubController.updateUserInterests);
router.get('/interests/suggestions', newsHubController.getSuggestedTopics);

// Trending and discovery
router.get('/trending', newsHubController.getTrendingTopics);
router.get('/sources', newsHubController.getAvailableSources);
router.get('/categories', newsHubController.getAvailableCategories);

// Article actions
router.post('/articles/:id/read', newsHubController.markArticleAsRead);
router.post('/articles/:id/save', newsHubController.toggleArticleSaved);
router.post('/articles/:id/favorite', newsHubController.toggleArticleFavorite);

// WhatsApp integration
router.get('/whatsapp/groups', newsHubController.getWhatsAppGroups);

// Push article to messaging platforms
router.post('/articles/:id/push/telegram', newsHubController.pushArticleToTelegram);
router.post('/articles/:id/push/whatsapp', newsHubController.pushArticleToWhatsApp);

export default router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const newsController_1 = require("../controllers/newsController");
const router = express_1.default.Router();
// All routes require authentication
router.use(authMiddleware_1.authMiddleware);
// News item operations
router.get('/', newsController_1.getNewsItems);
router.get('/categories', newsController_1.getNewsCategories);
router.get('/statistics', newsController_1.getNewsStatistics);
router.post('/bulk/mark-read', newsController_1.bulkMarkAsRead);
router.get('/:newsId', newsController_1.getNewsItemById);
router.delete('/:newsId', newsController_1.deleteNewsItem);
// News item actions
router.post('/:newsId/read', newsController_1.markAsRead);
router.post('/:newsId/favorite', newsController_1.toggleFavorite);
router.post('/:newsId/archive', newsController_1.archiveNewsItem);
exports.default = router;

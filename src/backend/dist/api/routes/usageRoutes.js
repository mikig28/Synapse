"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const usageController_1 = require("../controllers/usageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.get('/pricing', usageController_1.getTierPricing);
// Protected routes (require authentication)
router.use(authMiddleware_1.protect);
// User usage routes
router.get('/my-usage', usageController_1.getUserUsage);
router.get('/my-usage/history', usageController_1.getUserUsageHistory);
router.post('/check-limit', usageController_1.checkUsageLimit);
router.post('/track-event', usageController_1.trackUsageEvent);
// Beta testing routes
router.post('/simulate-upgrade', usageController_1.simulateTierUpgrade);
// Analytics routes (admin access)
router.get('/analytics', usageController_1.getUsageAnalytics);
exports.default = router;

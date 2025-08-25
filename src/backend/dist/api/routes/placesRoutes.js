"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const placesController_1 = require("../controllers/placesController");
const router = express_1.default.Router();
// Health check endpoint (no auth)
router.get('/health', placesController_1.healthCheck);
// Search for places using Google Places API
router.get('/search', authMiddleware_1.protect, placesController_1.searchPlaces);
// Extract location from text using AI
router.post('/extract-location', authMiddleware_1.protect, placesController_1.extractLocationFromText);
// Test location extraction with predefined cases
router.get('/test-extraction', authMiddleware_1.protect, placesController_1.testLocationExtraction);
exports.default = router;

import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { searchPlaces, extractLocationFromText, testLocationExtraction, healthCheck } from '../controllers/placesController';

const router = express.Router();

// Health check endpoint (no auth)
router.get('/health', healthCheck);

// Search for places using Google Places API
router.get('/search', protect, searchPlaces);

// Extract location from text using AI
router.post('/extract-location', protect, extractLocationFromText);

// Test location extraction with predefined cases (temporary - no auth for testing)
router.get('/test-extraction', testLocationExtraction);

export default router;
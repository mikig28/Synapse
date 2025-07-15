import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { searchPlaces, extractLocationFromText } from '../controllers/placesController';

const router = express.Router();

// Search for places using Google Places API
router.get('/search', protect, searchPlaces);

// Extract location from text using AI
router.post('/extract-location', protect, extractLocationFromText);

export default router;
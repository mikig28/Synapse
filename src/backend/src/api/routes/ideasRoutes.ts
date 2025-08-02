import express from 'express';
import { getIdeas, createIdea, deleteIdea } from '../controllers/ideasController';
import { protect } from '../middleware/authMiddleware';
import { trackContentCreation } from '../../middleware/usageTracking';

const router = express.Router();

router.get('/', protect, getIdeas);
router.post('/', protect, trackContentCreation('idea'), createIdea);
router.delete('/:id', protect, deleteIdea);

export default router; 
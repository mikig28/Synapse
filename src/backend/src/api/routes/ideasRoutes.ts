import express from 'express';
import { getIdeas, createIdea, deleteIdea } from '../controllers/ideasController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getIdeas);
router.post('/', protect, createIdea);
router.delete('/:id', protect, deleteIdea);

export default router; 
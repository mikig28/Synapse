import express from 'express';
import { getNotes, createNote, deleteNote } from '../controllers/notesController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getNotes);
router.post('/', protect, createNote);
router.delete('/:id', protect, deleteNote);

export default router; 
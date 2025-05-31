import express from 'express';
import { getNotes, createNote, deleteNote, updateNote } from '../controllers/notesController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getNotes);
router.post('/', protect, createNote);
router.put('/:id', protect, updateNote);
router.delete('/:id', protect, deleteNote);

export default router; 
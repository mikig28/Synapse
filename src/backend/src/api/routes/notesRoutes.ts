import express from 'express';
import { getNotes, createNote, deleteNote, updateNote, geotagNote, getNearbyNotes } from '../controllers/notesController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getNotes);
router.post('/', protect, createNote);
router.put('/:id', protect, updateNote);
router.delete('/:id', protect, deleteNote);
router.post('/:id/geotag', protect, geotagNote);
router.get('/nearby', protect, getNearbyNotes);

export default router; 
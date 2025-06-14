import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getMeetings,
  getMeeting,
  createMeeting,
  processTranscription,
  updateMeeting,
  deleteMeeting,
  reprocessMeeting,
  getMeetingStats,
  uploadAudio
} from '../controllers/meetingsController';

const router = Router();

// Apply authentication middleware to all routes
router.use(protect);

// GET /api/v1/meetings/stats - Get meeting statistics
router.get('/stats', getMeetingStats);

// GET /api/v1/meetings - Get all meetings for user
router.get('/', getMeetings);

// POST /api/v1/meetings - Create a new meeting
router.post('/', createMeeting);

// GET /api/v1/meetings/:id - Get specific meeting
router.get('/:id', getMeeting);

// PUT /api/v1/meetings/:id - Update meeting
router.put('/:id', updateMeeting);

// DELETE /api/v1/meetings/:id - Delete meeting
router.delete('/:id', deleteMeeting);

// POST /api/v1/meetings/:id/transcription - Process transcription for meeting
router.post('/:id/transcription', processTranscription);

// POST /api/v1/meetings/:id/reprocess - Reprocess meeting analysis
router.post('/:id/reprocess', reprocessMeeting);

// POST /api/v1/meetings/:id/upload-audio - Upload audio for meeting
router.post('/:id/upload-audio', uploadAudio);

export default router;

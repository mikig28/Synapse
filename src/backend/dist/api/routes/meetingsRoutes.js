"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const usageTracking_1 = require("../../middleware/usageTracking");
const meetingsController_1 = require("../controllers/meetingsController");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.protect);
// GET /api/v1/meetings/stats - Get meeting statistics
router.get('/stats', meetingsController_1.getMeetingStats);
// GET /api/v1/meetings - Get all meetings for user
router.get('/', meetingsController_1.getMeetings);
// POST /api/v1/meetings - Create a new meeting
router.post('/', (0, usageTracking_1.trackContentCreation)('meeting'), meetingsController_1.createMeeting);
// GET /api/v1/meetings/:id - Get specific meeting
router.get('/:id', meetingsController_1.getMeeting);
// PUT /api/v1/meetings/:id - Update meeting
router.put('/:id', meetingsController_1.updateMeeting);
// DELETE /api/v1/meetings/:id - Delete meeting
router.delete('/:id', meetingsController_1.deleteMeeting);
// POST /api/v1/meetings/:id/transcription - Process transcription for meeting
router.post('/:id/transcription', meetingsController_1.processTranscription);
// POST /api/v1/meetings/:id/reprocess - Reprocess meeting analysis
router.post('/:id/reprocess', meetingsController_1.reprocessMeeting);
// POST /api/v1/meetings/:id/upload-audio - Upload audio for meeting
router.post('/:id/upload-audio', meetingsController_1.uploadAudio);
exports.default = router;

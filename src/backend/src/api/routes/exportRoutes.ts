import express from 'express';
import {
  createExportJob,
  getExportJobStatus,
  downloadExportFile,
  getExportHistory
} from '../controllers/exportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Protect all routes
router.use(protect);

// Create new export job
router.post('/', createExportJob as any);

// Get export history for user
router.get('/history', getExportHistory as any);

// Get export job status
router.get('/:jobId/status', getExportJobStatus as any);

// Download export file
router.get('/:jobId/download', downloadExportFile as any);

export default router;
import express from 'express';
import { migrateWhatsAppMetadata, getMigrationStatus } from '../controllers/migrationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Apply authentication middleware
router.use(authMiddleware);

// Migration status endpoint (safe to call anytime)
router.get('/status', getMigrationStatus);

// Migration execution endpoint (only in non-production)
router.post('/whatsapp-metadata', migrateWhatsAppMetadata);

export default router;
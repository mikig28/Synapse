import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import GroupMonitorController from '../controllers/groupMonitorController';

const router = express.Router();
const groupMonitorController = new GroupMonitorController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Person Profile routes
router.post('/persons', (req, res) => groupMonitorController.createPersonProfile(req, res));
router.get('/persons', (req, res) => groupMonitorController.getPersonProfiles(req, res));
router.get('/persons/:id', (req, res) => groupMonitorController.getPersonProfile(req, res));
router.put('/persons/:id', (req, res) => groupMonitorController.updatePersonProfile(req, res));
router.delete('/persons/:id', (req, res) => groupMonitorController.deletePersonProfile(req, res));
router.post('/persons/:id/training-images', (req, res) => groupMonitorController.addTrainingImages(req, res));

// Group Monitor routes
router.post('/monitors', (req, res) => groupMonitorController.createGroupMonitor(req, res));
router.get('/monitors', (req, res) => groupMonitorController.getGroupMonitors(req, res));
router.put('/monitors/:id', (req, res) => groupMonitorController.updateGroupMonitor(req, res));
router.delete('/monitors/:id', (req, res) => groupMonitorController.deleteGroupMonitor(req, res));
router.get('/monitors/:id/statistics', (req, res) => groupMonitorController.getMonitorStatistics(req, res));

// Filtered Images routes
router.get('/filtered-images', (req, res) => groupMonitorController.getFilteredImages(req, res));
router.put('/filtered-images/:id/archive', (req, res) => groupMonitorController.archiveFilteredImage(req, res));
router.post('/filtered-images/:id/tags', (req, res) => groupMonitorController.addImageTag(req, res));

// Service status route (no auth required)
router.get('/status', (req, res) => groupMonitorController.getServiceStatus(req, res));

// Webhook for processing WhatsApp messages (no auth required - called by WhatsApp service)
router.post('/webhook/whatsapp-message', (req, res) => groupMonitorController.processWhatsAppMessage(req, res));

export default router;
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const exportController_1 = require("../controllers/exportController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Protect all routes
router.use(authMiddleware_1.protect);
// Create new export job
router.post('/', exportController_1.createExportJob);
// Get export history for user
router.get('/history', exportController_1.getExportHistory);
// Get export job status
router.get('/:jobId/status', exportController_1.getExportJobStatus);
// Download export file
router.get('/:jobId/download', exportController_1.downloadExportFile);
exports.default = router;

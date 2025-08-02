"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tasksController_1 = require("../controllers/tasksController"); // Adjust path as necessary
const authMiddleware_1 = require("../middleware/authMiddleware"); // Assuming you have auth middleware
const usageTracking_1 = require("../../middleware/usageTracking");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, tasksController_1.getTasks);
router.post('/', authMiddleware_1.protect, (0, usageTracking_1.trackContentCreation)('task'), tasksController_1.createTask);
router.put('/:id', authMiddleware_1.protect, tasksController_1.updateTask);
router.delete('/:id', authMiddleware_1.protect, tasksController_1.deleteTask);
router.post('/send-reminder', authMiddleware_1.protect, tasksController_1.sendTaskReminder);
router.post('/:id/geotag', authMiddleware_1.protect, tasksController_1.geotagTask);
router.get('/nearby', authMiddleware_1.protect, tasksController_1.getNearbyTasks);
exports.default = router;

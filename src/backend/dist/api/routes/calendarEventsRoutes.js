"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const calendarEventsController_1 = require("../controllers/calendarEventsController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Assuming you have this middleware
const router = express_1.default.Router();
// Apply protect middleware to all routes in this file
router.use(authMiddleware_1.protect);
router.route('/')
    .get(calendarEventsController_1.getAllCalendarEvents)
    .post(calendarEventsController_1.createCalendarEvent);
router.route('/:id')
    .put(calendarEventsController_1.updateCalendarEvent)
    .delete(calendarEventsController_1.deleteCalendarEvent);
// Google Calendar sync routes
router.post('/sync', calendarEventsController_1.syncWithGoogleCalendar);
router.get('/sync/status', calendarEventsController_1.getSyncStatus);
router.post('/sync/import', calendarEventsController_1.importFromGoogleCalendar);
router.post('/sync/export', calendarEventsController_1.exportToGoogleCalendar);
// Debug route
router.get('/debug', calendarEventsController_1.debugCalendarEvents);
exports.default = router;

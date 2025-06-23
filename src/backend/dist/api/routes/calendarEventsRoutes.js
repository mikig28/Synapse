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
exports.default = router;

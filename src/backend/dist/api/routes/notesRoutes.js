"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notesController_1 = require("../controllers/notesController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const usageTracking_1 = require("../../middleware/usageTracking");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, notesController_1.getNotes);
router.post('/', authMiddleware_1.protect, (0, usageTracking_1.trackContentCreation)('note'), notesController_1.createNote);
router.put('/:id', authMiddleware_1.protect, notesController_1.updateNote);
router.delete('/:id', authMiddleware_1.protect, notesController_1.deleteNote);
router.post('/:id/geotag', authMiddleware_1.protect, notesController_1.geotagNote);
router.get('/nearby', authMiddleware_1.protect, notesController_1.getNearbyNotes);
exports.default = router;

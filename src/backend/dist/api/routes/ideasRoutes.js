"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ideasController_1 = require("../controllers/ideasController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const usageTracking_1 = require("../../middleware/usageTracking");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, ideasController_1.getIdeas);
router.post('/', authMiddleware_1.protect, (0, usageTracking_1.trackContentCreation)('idea'), ideasController_1.createIdea);
router.delete('/:id', authMiddleware_1.protect, ideasController_1.deleteIdea);
exports.default = router;

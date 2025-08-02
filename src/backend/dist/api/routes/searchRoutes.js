"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const searchController_1 = require("../controllers/searchController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Protect all routes
router.use(authMiddleware_1.protect);
// Universal search across all content types
router.post('/universal', searchController_1.universalSearch);
// Get search suggestions
router.get('/suggestions', searchController_1.getSearchSuggestions);
// Get search statistics
router.get('/stats', searchController_1.getSearchStats);
exports.default = router;

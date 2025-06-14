"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController"); // Adjust path as necessary
const router = express_1.default.Router();
// @route   POST api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController_1.registerUser);
// @route   POST api/v1/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController_1.loginUser);
// We can add more auth-related routes here later (e.g., /me, /google, /google/callback)
exports.default = router;

import express from 'express';
import { registerUser, loginUser } from '../controllers/authController'; // Adjust path as necessary

const router = express.Router();

// @route   POST api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/v1/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// We can add more auth-related routes here later (e.g., /me, /google, /google/callback)

export default router; 
import express from 'express';
import { registerUser, loginUser } from '../controllers/authController'; // Adjust path as necessary
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// @route   POST api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/v1/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// @route   GET api/v1/auth/me
// @desc    Get current user info (debug endpoint)
// @access  Private
router.get('/me', protect, (req: any, res) => {
  console.log('[AuthRoutes] /me endpoint called, user:', req.user);
  res.json({
    success: true,
    user: req.user,
    message: 'Authentication working correctly'
  });
});

// We can add more auth-related routes here later (e.g., /google, /google/callback)

export default router; 
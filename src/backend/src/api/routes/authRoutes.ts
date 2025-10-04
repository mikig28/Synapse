import express from 'express';
import { registerUser, loginUser, googleLogin, verifyEmail, resendVerificationEmail } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for resend verification (3 requests per 15 minutes)
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: 'Too many verification email requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/v1/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// @route   POST api/v1/auth/google-login
// @desc    Authenticate user with Google & get token
// @access  Public
router.post('/google-login', googleLogin);

// @route   GET api/v1/auth/verify-email/:token
// @desc    Verify user email with token
// @access  Public
router.get('/verify-email/:token', verifyEmail);

// @route   POST api/v1/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', resendLimiter, resendVerificationEmail);

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
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
router.post('/login', (req, res) => {
  console.log('AUTH_ROUTES /login HIT - Body:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ message: "Auth route /login was hit successfully" });
});

// We can add more auth-related routes here later (e.g., /me, /google, /google/callback)

export default router; 
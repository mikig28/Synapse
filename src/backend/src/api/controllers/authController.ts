import { Request, Response } from 'express';
import User, { IUser } from '../../models/User'; // Adjust path as necessary
import jwt from 'jsonwebtoken'; // We'll install this next

// Function to generate JWT
// Store your JWT_SECRET in .env file
const generateToken = (id: string) => {
  console.log(`[generateToken] Generating token for user ID: ${id}`);
  return jwt.sign({ id }, process.env.JWT_SECRET || 'yourfallbacksecret', {
    expiresIn: '30d', // Token expiration
  });
};

export const registerUser = async (req: Request, res: Response) => {
  console.log('Received registration request body:', req.body); // ADDED THIS LOG
  const { fullName, email, password } = req.body;

  // Simple validation to ensure email and password are provided before Mongoose validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      fullName,
      email,
      password,
    });

    await user.save();

    // Password is not selected by default, so user object from save() won't have it.
    // We fetch it again if we need it, or more commonly, just generate token with id.
    // For the response, we typically don't send the password back.

    if (user && user.id) {
      res.status(201).json({
        _id: user.id,
        fullName: user.fullName,
        email: user.email,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data or user ID not found after save' });
    }
  } catch (error: any) {
    console.error('[REGISTER_USER_ERROR]', error); // Log the full error
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  console.log('LOGIN ATTEMPT - Raw Request Body:', JSON.stringify(req.body, null, 2)); // Log raw body
  const { email, password } = req.body;

  console.log(`LOGIN ATTEMPT - Email: ${email}, Type: ${typeof email}`);
  console.log(`LOGIN ATTEMPT - Password Present: ${password ? 'Yes' : 'No'}, Type: ${typeof password}`);

  if (!email || !password) {
    console.log('LOGIN REJECTED - Missing email or password');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email. We need to explicitly select the password field 
    // because it's set to select: false in the schema by default.
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.comparePassword(password))) {
      const token = generateToken(user.id);
      console.log(`[loginUser] User ${user.email} (ID: ${user.id}) logged in. Token generated.`);
      res.json({
        _id: user.id,
        fullName: user.fullName,
        email: user.email,
        token: token,
      });
    } else {
      // Generic message for security; don't reveal if email exists but password was wrong
      res.status(401).json({ message: 'Invalid email or password' }); 
    }
  } catch (error: any) {
    console.error('[LOGIN_USER_ERROR]', error);
    res.status(500).json({ message: error.message });
  }
}; 
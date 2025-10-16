import { Request, Response } from 'express';
import User, { IUser } from '../../models/User'; // Adjust path as necessary
import jwt from 'jsonwebtoken'; // We'll install this next
import crypto from 'crypto';
import emailService from '../../services/emailService';

// Function to generate JWT
// Store your JWT_SECRET in .env file
const generateToken = (id: string, email?: string) => {
  console.log(`[generateToken] Generating token for user ID: ${id}, email: ${email}`);
  const payload: { id: string; email?: string } = { id };
  if (email) {
    payload.email = email;
  }
  return jwt.sign(payload, process.env.JWT_SECRET || 'yourfallbacksecret', {
    expiresIn: '30d', // Token expiration
  });
};

export const registerUser = async (req: Request, res: Response) => {
  console.log('Received registration request body:', req.body);
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

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create new user (email not verified yet)
    const user = new User({
      fullName,
      email,
      password,
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: tokenExpiry,
    });

    await user.save();
    console.log(`[registerUser] User created successfully: ${email}`);

    // Send verification email
    console.log(`[registerUser] Attempting to send verification email to ${email}...`);
    const emailSent = await emailService.sendVerificationEmail(email, verificationToken, fullName);

    if (!emailSent) {
      console.error(`[registerUser] ❌ FAILED to send verification email to ${email}`);
      console.error(`[registerUser] User was created but email was not sent. User must use resend or manual verification.`);
      // Still return success - user was created, they can resend email later
    } else {
      console.log(`[registerUser] ✅ Verification email sent successfully to ${email}`);
    }

    // Return success WITHOUT logging the user in
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      email: user.email,
      requiresVerification: true,
      emailSent: emailSent, // Let frontend know if email was actually sent
    });

  } catch (error: any) {
    console.error('[REGISTER_USER_ERROR]', error);
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
      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json({
          message: 'Please verify your email before logging in. Check your inbox for the verification link.',
          requiresVerification: true,
          email: user.email
        });
      }

      // Update last login timestamp and metadata
      user.lastLogin = new Date();
      if (!user.metadata) {
        user.metadata = {};
      }
      user.metadata.lastIp = req.ip || req.connection.remoteAddress;
      user.metadata.lastUserAgent = req.headers['user-agent'];
      await user.save();

      const token = generateToken(user.id, user.email);
      console.log(`[loginUser] User ${user.email} (ID: ${user.id}) logged in. Token generated.`);
      res.json({
        _id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
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

export const googleLogin = async (req: Request, res: Response) => {
  console.log('GOOGLE LOGIN ATTEMPT - Request Body:', JSON.stringify(req.body, null, 2));
  const { googleUserInfo, googleAccessToken } = req.body;

  if (!googleUserInfo || !googleUserInfo.email || !googleUserInfo.sub) {
    console.log('GOOGLE LOGIN REJECTED - Missing Google user info');
    return res.status(400).json({ message: 'Google user information is required' });
  }

  try {
    // Check if user already exists by email
    let user = await User.findOne({ email: googleUserInfo.email });

    if (!user) {
      // Create new user with Google info (auto-verified)
      user = new User({
        fullName: googleUserInfo.name,
        email: googleUserInfo.email,
        // For Google users, we don't have a password, so we'll create a placeholder
        // or handle this differently in your User model
        password: `google_${googleUserInfo.sub}_${Date.now()}`, // Temporary password
        googleId: googleUserInfo.sub, // Store Google ID for future reference
        isEmailVerified: true, // Google users are auto-verified
      });

      await user.save();
      console.log(`[googleLogin] New user created for Google login: ${user.email} (ID: ${user.id})`);
    } else {
      console.log(`[googleLogin] Existing user found for Google login: ${user.email} (ID: ${user.id})`);
      // Optionally update Google ID if not set and auto-verify
      if (!user.googleId) {
        user.googleId = googleUserInfo.sub;
        user.isEmailVerified = true;
      }
    }

    // Update last login timestamp and metadata for all Google logins
    user.lastLogin = new Date();
    if (!user.metadata) {
      user.metadata = {};
    }
    user.metadata.lastIp = req.ip || req.connection.remoteAddress;
    user.metadata.lastUserAgent = req.headers['user-agent'];
    await user.save();

    const token = generateToken(user.id, user.email);
    console.log(`[googleLogin] User ${user.email} (ID: ${user.id}) logged in via Google. Token generated.`);

    res.json({
      _id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: token,
    });

  } catch (error: any) {
    console.error('[GOOGLE_LOGIN_ERROR]', error);
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token. Please request a new verification email.',
        expired: true,
      });
    }

    // Mark email as verified and clear verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    console.log(`[verifyEmail] Email verified successfully for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      email: user.email,
    });

  } catch (error: any) {
    console.error('[VERIFY_EMAIL_ERROR]', error);
    res.status(500).json({ message: 'Failed to verify email. Please try again.' });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a verification link has been sent.',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified. You can log in now.' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = tokenExpiry;
    await user.save();

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(email, verificationToken, user.fullName);

    if (!emailSent) {
      console.error(`[resendVerificationEmail] Failed to send verification email to ${email}`);
      console.error(`[resendVerificationEmail] Check SMTP configuration: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD`);
      return res.status(500).json({ 
        message: 'Email service is currently unavailable. Please contact support.',
        error: 'SMTP_NOT_CONFIGURED'
      });
    }

    console.log(`[resendVerificationEmail] ✅ Verification email sent successfully to ${email}`);
    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });

  } catch (error: any) {
    console.error('[RESEND_VERIFICATION_ERROR]', error);
    res.status(500).json({ message: 'Failed to resend verification email. Please try again.' });
  }
}; 
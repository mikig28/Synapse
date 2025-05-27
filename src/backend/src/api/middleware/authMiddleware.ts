import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, Express } from 'express'; // Added Express
import User from '../../models/User'; // Adjust path as necessary

interface JwtPayload {
  id: string;
}

// Extend Express Request type to include user and potentially a file from multer
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    // Include other user properties if you fetch them here
  };
  file?: Express.Multer.File; // Added for multer file uploads
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yourfallbacksecret') as JwtPayload;
      
      // Attach user to request object (without password)
      // In a real app, you might want to check if user still exists, is not blocked, etc.
      req.user = { id: decoded.id }; // Or fetch full user: await User.findById(decoded.id).select('-password');
      
      next();
    } catch (error) {
      console.error('Token verification failed', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

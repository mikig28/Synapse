import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../../models/User'; // Adjust path as necessary
import { AuthenticatedRequest } from '../../types/express';

interface JwtPayload {
  id: string;
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
      // Ensure CORS headers are set before sending 401
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    // Ensure CORS headers are set before sending 401
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }
};

// Export as authMiddleware for compatibility
export const authMiddleware = protect;

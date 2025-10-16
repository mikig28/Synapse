import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { IUser } from '../models/User';

// Extend Express Request to include our custom properties
// Note: logger is declared in requestId.ts middleware
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        userId?: string; // Added for backward compatibility
      };
      adminUser?: IUser;
      isAdmin?: boolean;
    }
  }
}

export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> extends ExpressRequest<P, ResBody, ReqBody, ReqQuery> {
  user: {
    id: string;
    email: string;
    userId?: string; // Added for backward compatibility
  };
  adminUser?: IUser; // Full user object for admin routes
  isAdmin?: boolean; // Flag for conditional admin logic
}

export type AuthRequest = ExpressRequest & {
  user?: {
    id: string;
    email: string;
    userId?: string; // Added for backward compatibility
  };
};

export type { Response, NextFunction };

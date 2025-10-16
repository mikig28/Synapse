import { Request as ExpressRequest } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        userId?: string; // Added for backward compatibility
      };
      file?: Express.Multer.File;
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
}

export interface AuthRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    userId?: string; // Added for backward compatibility
  };
}

// Re-export for convenience
export { Request, Response, NextFunction } from 'express';
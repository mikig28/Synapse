import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      file?: Express.Multer.File;
    }
  }
}

export interface AuthenticatedRequest extends express.Request {
  user: {
    id: string;
    email: string;
  };
}

export interface AuthRequest extends express.Request {
  user?: {
    id: string;
    email: string;
  };
}
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
      file?: Express.Multer.File;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
} 
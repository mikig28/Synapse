import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { IUser } from '../models/User';

export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> extends ExpressRequest<P, ResBody, ReqBody, ReqQuery> {
  user: {
    id: string;
    email: string;
  };
  adminUser?: IUser; // Full user object for admin routes
  isAdmin?: boolean; // Flag for conditional admin logic
  logger?: any; // Winston logger instance
}

export type AuthRequest = ExpressRequest & {
  user?: {
    id: string;
    email: string;
  };
};

export type { Response, NextFunction };

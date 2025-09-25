import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

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
}

export type AuthRequest = ExpressRequest & {
  user?: {
    id: string;
    email: string;
  };
};

export type { Response, NextFunction };

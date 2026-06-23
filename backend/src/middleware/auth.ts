import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { verifyToken, JwtPayload } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { AuthUser } from '../lib/userDto.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      jwtPayload?: JwtPayload;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const token = header.slice(7);
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
    }

    req.jwtPayload = payload;
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
      return;
    }
    next();
  };
}

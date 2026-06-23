import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError, errorResponse } from '../lib/errors.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid input', details));
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    res
      .status(503)
      .json(
        errorResponse(
          'SERVICE_UNAVAILABLE',
          'Database is unavailable. Start PostgreSQL (docker compose up -d) and run migrations.',
        ),
      );
    return;
  }

  console.error(err);
  res.status(500).json(errorResponse('INTERNAL_ERROR', 'Internal server error'));
}

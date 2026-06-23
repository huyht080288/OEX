import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import { successResponse } from '../lib/errors.js';
import { changePasswordSchema, loginSchema } from '../validators/auth.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const data = await authService.login(input);
    res.json(successResponse(data, 'Login successful'));
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await authService.getMe(req.user!.id);
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.id, input);
    res.json(successResponse(null, 'Password updated'));
  } catch (err) {
    next(err);
  }
}

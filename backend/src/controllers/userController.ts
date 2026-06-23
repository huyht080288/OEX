import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService.js';
import { successResponse } from '../lib/errors.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  listUsersQuerySchema,
} from '../validators/users.js';

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const data = await userService.listUsers(query);
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await userService.getUserById(paramId(req));
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createUserSchema.parse(req.body);
    const data = await userService.createUser(input);
    res.status(201).json(successResponse(data, 'User created'));
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateUserSchema.parse(req.body);
    const data = await userService.updateUser(paramId(req), input);
    res.json(successResponse(data, 'User updated'));
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateUserStatusSchema.parse(req.body);
    const data = await userService.updateUserStatus(paramId(req), input.isActive);
    res.json(successResponse(data, 'User status updated'));
  } catch (err) {
    next(err);
  }
}

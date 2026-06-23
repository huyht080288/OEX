import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as studentService from '../services/studentService.js';
import { successResponse } from '../lib/errors.js';

const querySchema = z.object({
  search: z.string().optional(),
});

export async function listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = querySchema.parse(req.query);
    const data = await studentService.listStudents(query.search);
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

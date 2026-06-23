import { Request, Response, NextFunction } from 'express';
import * as subjectService from '../services/subjectService.js';
import { successResponse } from '../lib/errors.js';
import { createSubjectSchema, updateSubjectSchema } from '../validators/subjects.js';
import { paramId } from '../lib/params.js';

export async function listSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await subjectService.listSubjects(req.user!.id);
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSubjectSchema.parse(req.body);
    const data = await subjectService.createSubject(req.user!.id, input);
    res.status(201).json(successResponse(data, 'Subject created'));
  } catch (err) {
    next(err);
  }
}

export async function getSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await subjectService.getSubject(req.user!.id, paramId(req));
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function updateSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateSubjectSchema.parse(req.body);
    const data = await subjectService.updateSubject(req.user!.id, paramId(req), input);
    res.json(successResponse(data, 'Subject updated'));
  } catch (err) {
    next(err);
  }
}

export async function deleteSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await subjectService.deleteSubject(req.user!.id, paramId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

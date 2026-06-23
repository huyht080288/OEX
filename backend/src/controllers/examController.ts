import { Request, Response, NextFunction } from 'express';
import * as examService from '../services/examService.js';
import { successResponse } from '../lib/errors.js';
import {
  createExamSchema,
  updateExamSchema,
  setExamQuestionsSchema,
  updateExamStatusSchema,
  assignStudentsSchema,
} from '../validators/exams.js';
import { paramId } from '../lib/params.js';

export async function listExams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await examService.listExams(req.user!.id);
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function createExam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createExamSchema.parse(req.body);
    const data = await examService.createExam(req.user!.id, input);
    res.status(201).json(successResponse(data, 'Exam created'));
  } catch (err) {
    next(err);
  }
}

export async function getExam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await examService.getExam(req.user!.id, paramId(req));
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function updateExam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateExamSchema.parse(req.body);
    const data = await examService.updateExam(req.user!.id, paramId(req), input);
    res.json(successResponse(data, 'Exam updated'));
  } catch (err) {
    next(err);
  }
}

export async function deleteExam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await examService.deleteExam(req.user!.id, paramId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function setExamQuestions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = setExamQuestionsSchema.parse(req.body);
    const data = await examService.setExamQuestions(req.user!.id, paramId(req), input);
    res.json(successResponse(data, 'Exam questions updated'));
  } catch (err) {
    next(err);
  }
}

export async function updateExamStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateExamStatusSchema.parse(req.body);
    const data = await examService.updateExamStatus(req.user!.id, paramId(req), input);
    res.json(successResponse(data, 'Exam status updated'));
  } catch (err) {
    next(err);
  }
}

export async function assignStudents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = assignStudentsSchema.parse(req.body);
    const data = await examService.assignStudents(req.user!.id, paramId(req), input);
    res.status(201).json(successResponse(data, 'Students assigned'));
  } catch (err) {
    next(err);
  }
}

export async function listAssignments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await examService.listAssignments(req.user!.id, paramId(req));
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function removeAssignment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await examService.removeAssignment(req.user!.id, paramId(req), paramId(req, 'assignmentId'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getExamResults(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await examService.getExamResults(req.user!.id, paramId(req));
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function getExamAttemptResult(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await examService.getExamAttemptResult(
      req.user!.id,
      paramId(req),
      paramId(req, 'attemptId'),
    );
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

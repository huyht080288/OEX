import { Request, Response, NextFunction } from 'express';
import * as questionService from '../services/questionService.js';
import { successResponse } from '../lib/errors.js';
import {
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionsQuerySchema,
} from '../validators/questions.js';
import { paramId } from '../lib/params.js';

export async function listQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listQuestionsQuerySchema.parse(req.query);
    const data = await questionService.listQuestions(req.user!.id, query);
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function createQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createQuestionSchema.parse(req.body);
    const data = await questionService.createQuestion(req.user!.id, input);
    res.status(201).json(successResponse(data, 'Question created'));
  } catch (err) {
    next(err);
  }
}

export async function getQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await questionService.getQuestion(req.user!.id, paramId(req));
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateQuestionSchema.parse(req.body);
    const data = await questionService.updateQuestion(req.user!.id, paramId(req), input);
    res.json(successResponse(data, 'Question updated'));
  } catch (err) {
    next(err);
  }
}

export async function deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await questionService.deleteQuestion(req.user!.id, paramId(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import * as attemptService from '../services/attemptService.js';
import { successResponse } from '../lib/errors.js';
import { startAttemptSchema, saveAnswersSchema } from '../validators/attempts.js';
import { paramId } from '../lib/params.js';

export async function listMyExams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await attemptService.listMyExams(req.user!.id);
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function startAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = startAttemptSchema.parse(req.body);
    const data = await attemptService.startAttempt(req.user!.id, input);
    res.status(201).json(successResponse(data, 'Attempt started'));
  } catch (err) {
    next(err);
  }
}

export async function getAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await attemptService.getAttempt(req.user!.id, paramId(req));
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

export async function saveAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = saveAnswersSchema.parse(req.body);
    const data = await attemptService.saveAnswers(req.user!.id, paramId(req), input);
    res.json(successResponse(data, 'Answers saved'));
  } catch (err) {
    next(err);
  }
}

export async function submitAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await attemptService.submitAttempt(req.user!.id, paramId(req));
    res.json(successResponse(data, 'Exam submitted'));
  } catch (err) {
    next(err);
  }
}

export async function getAttemptResult(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await attemptService.getAttemptResult(req.user!.id, paramId(req));
    res.json(successResponse(data));
  } catch (err) {
    next(err);
  }
}

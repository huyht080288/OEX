import { Router } from 'express';
import { Role } from '@prisma/client';
import * as attemptController from '../controllers/attemptController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole(Role.STUDENT));

router.post('/start', attemptController.startAttempt);
router.get('/:id/result', attemptController.getAttemptResult);
router.get('/:id', attemptController.getAttempt);
router.put('/:id/answers', attemptController.saveAnswers);
router.post('/:id/submit', attemptController.submitAttempt);

export default router;

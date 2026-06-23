import { Router } from 'express';
import { Role } from '@prisma/client';
import * as questionController from '../controllers/questionController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole(Role.TEACHER));

router.get('/', questionController.listQuestions);
router.post('/', questionController.createQuestion);
router.get('/:id', questionController.getQuestion);
router.put('/:id', questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);

export default router;

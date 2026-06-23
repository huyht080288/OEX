import { Router } from 'express';
import { Role } from '@prisma/client';
import * as attemptController from '../controllers/attemptController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole(Role.STUDENT));

router.get('/', attemptController.listMyExams);

export default router;

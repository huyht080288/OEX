import { Router } from 'express';
import { Role } from '@prisma/client';
import * as studentController from '../controllers/studentController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole(Role.TEACHER));

router.get('/', studentController.listStudents);

export default router;

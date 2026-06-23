import { Router } from 'express';
import { Role } from '@prisma/client';
import * as subjectController from '../controllers/subjectController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole(Role.TEACHER));

router.get('/', subjectController.listSubjects);
router.post('/', subjectController.createSubject);
router.get('/:id', subjectController.getSubject);
router.put('/:id', subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);

export default router;

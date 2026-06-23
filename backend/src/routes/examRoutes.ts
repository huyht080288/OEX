import { Router } from 'express';
import { Role } from '@prisma/client';
import * as examController from '../controllers/examController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole(Role.TEACHER));

router.get('/', examController.listExams);
router.post('/', examController.createExam);
router.get('/:id', examController.getExam);
router.put('/:id', examController.updateExam);
router.delete('/:id', examController.deleteExam);
router.put('/:id/questions', examController.setExamQuestions);
router.patch('/:id/status', examController.updateExamStatus);
router.post('/:id/assignments', examController.assignStudents);
router.get('/:id/assignments', examController.listAssignments);
router.delete('/:id/assignments/:assignmentId', examController.removeAssignment);
router.get('/:id/results', examController.getExamResults);
router.get('/:id/attempts/:attemptId', examController.getExamAttemptResult);

export default router;

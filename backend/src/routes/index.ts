import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import subjectRoutes from './subjectRoutes.js';
import questionRoutes from './questionRoutes.js';
import examRoutes from './examRoutes.js';
import myExamRoutes from './myExamRoutes.js';
import attemptRoutes from './attemptRoutes.js';
import studentRoutes from './studentRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/subjects', subjectRoutes);
router.use('/questions', questionRoutes);
router.use('/exams', examRoutes);
router.use('/my-exams', myExamRoutes);
router.use('/attempts', attemptRoutes);
router.use('/students', studentRoutes);

export default router;

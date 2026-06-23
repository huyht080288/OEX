import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.me);
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;

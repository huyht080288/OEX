import { Router } from 'express';
import { Role } from '@prisma/client';
import * as userController from '../controllers/userController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, requireRole(Role.ADMIN));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateUserStatus);

export default router;

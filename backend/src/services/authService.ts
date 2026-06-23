import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { signToken, expiresInSeconds } from '../lib/jwt.js';
import { toAuthProfile } from '../lib/userDto.js';
import { ChangePasswordInput, LoginInput } from '../validators/auth.js';

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'Account is deactivated');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const accessToken = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    accessToken,
    expiresIn: expiresInSeconds(),
    user: toAuthProfile(user),
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return toAuthProfile(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

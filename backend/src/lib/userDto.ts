import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toAuthProfile(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

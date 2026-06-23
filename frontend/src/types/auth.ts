import type { Role } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

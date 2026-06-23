import { apiClient, unwrap } from './client';
import type { Role } from '@/types/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export interface UpdateUserPayload {
  email?: string;
  fullName?: string;
  role?: Role;
}

export async function fetchUsers(params?: {
  role?: Role;
  search?: string;
}): Promise<User[]> {
  return unwrap(apiClient.get('/users', { params }));
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return unwrap(apiClient.post('/users', payload));
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  return unwrap(apiClient.put(`/users/${id}`, payload));
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<User> {
  return unwrap(apiClient.patch(`/users/${id}/status`, { isActive }));
}

import { apiClient, unwrap } from './client';
import type { AuthUser, LoginPayload, LoginResult } from '@/types/auth';

export async function login(payload: LoginPayload): Promise<LoginResult> {
  return unwrap(apiClient.post('/auth/login', payload));
}

export async function fetchMe(): Promise<AuthUser> {
  return unwrap(apiClient.get('/auth/me'));
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await unwrap(
    apiClient.post('/auth/change-password', { currentPassword, newPassword }),
  );
}

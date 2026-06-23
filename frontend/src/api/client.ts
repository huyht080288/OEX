import axios, { type AxiosError } from 'axios';
import type { ApiError, ApiResponse } from '@/types/api';

const TOKEN_KEY = 'oex_access_token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      setStoredToken(null);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (!data.success) {
    const err = new Error(data.error.message) as Error & { code?: string };
    err.code = data.error.code;
    throw err;
  }
  return data.data;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.error?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function getErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.error?.code;
  }
  if (error instanceof Error && 'code' in error) {
    return (error as Error & { code?: string }).code;
  }
  return undefined;
}

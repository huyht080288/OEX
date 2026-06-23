export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError<T>(res: ApiResponse<T>): res is ApiError {
  return !res.success;
}

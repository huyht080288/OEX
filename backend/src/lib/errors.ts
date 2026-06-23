export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  message: string;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export function successResponse<T>(data: T, message = 'OK'): SuccessEnvelope<T> {
  return { success: true, data, message };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown[],
): ErrorEnvelope {
  return {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
}

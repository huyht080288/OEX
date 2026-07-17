// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { isApiError } from '@/types/api';
import {
  apiClient,
  getErrorCode,
  getErrorMessage,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
  unwrap,
} from '@/api/client';

describe('API client', () => {
  let mock: AxiosMockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new AxiosMockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it('stores and removes the access token', () => {
    expect(getStoredToken()).toBeNull();

    setStoredToken('token-1');
    expect(getStoredToken()).toBe('token-1');

    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });

  it('attaches a Bearer token to requests', async () => {
    setStoredToken('token-2');
    mock.onGet('/probe').reply(200, { success: true, data: 'ok' });

    await apiClient.get('/probe');

    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer token-2');
  });

  it('clears authentication and calls the handler on a 401 response', async () => {
    const handler = vi.fn();
    setStoredToken('expired-token');
    setUnauthorizedHandler(handler);
    mock.onGet('/protected').reply(401, {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Expired' },
    });

    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(Error);
    expect(getStoredToken()).toBeNull();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('unwraps successful envelopes and throws application errors', async () => {
    await expect(
      unwrap(Promise.resolve({ data: { success: true, data: { id: 'one' } } })),
    ).resolves.toEqual({ id: 'one' });

    const failure = unwrap(
      Promise.resolve({
        data: {
          success: false as const,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
        },
      }),
    );

    await expect(failure).rejects.toMatchObject({
      message: 'Invalid input',
      code: 'VALIDATION_ERROR',
    });
  });

  it('extracts messages and codes from Axios, Error, and unknown values', () => {
    const axiosError = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        data: {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not allowed' },
        },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: {} } as never,
      },
    );
    const codedError = Object.assign(new Error('Coded failure'), { code: 'CUSTOM' });

    expect(getErrorMessage(axiosError)).toBe('Not allowed');
    expect(getErrorCode(axiosError)).toBe('FORBIDDEN');
    expect(getErrorMessage(codedError)).toBe('Coded failure');
    expect(getErrorCode(codedError)).toBe('CUSTOM');
    expect(getErrorMessage('unknown', 'Fallback')).toBe('Fallback');
    expect(getErrorCode('unknown')).toBeUndefined();
  });

  it('identifies failed API response envelopes', () => {
    expect(
      isApiError({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Missing' },
      }),
    ).toBe(true);
    expect(
      isApiError({
        success: true,
        data: { id: 'one' },
        message: 'OK',
      }),
    ).toBe(false);
  });
});

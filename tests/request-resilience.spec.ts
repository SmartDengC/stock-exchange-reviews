import type { AxiosResponse, InternalAxiosRequestConfig } from '@vben/request';

import { AxiosError, CanceledError } from '@vben/request';

import { describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  isCanceledRequest,
  requestClient,
} from '#/api/request';

function successResponse(
  config: InternalAxiosRequestConfig,
  data?: unknown,
): AxiosResponse {
  return {
    config,
    data: data ?? { ok: true },
    headers: {},
    status: 200,
    statusText: 'OK',
  };
}

describe('API request resilience', () => {
  it('retries a timed out JSON GET once with the same request id', async () => {
    const attempts: Array<{ attempt: string; requestId: string; timeout: number }> = [];
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      attempts.push({
        attempt: String(config.headers.get('X-Request-Attempt')),
        requestId: String(config.headers.get('X-Request-ID')),
        timeout: config.timeout,
      });
      if (attempts.length === 1) {
        throw new AxiosError('timeout', 'ECONNABORTED', config, {});
      }
      return successResponse(config);
    });

    await expect(requestClient.get('/test/retry-timeout', { adapter })).resolves.toEqual({ ok: true });

    expect(adapter).toHaveBeenCalledTimes(2);
    expect(attempts.map(({ attempt }) => attempt)).toEqual(['1', '2']);
    expect(attempts[0]?.requestId).toBeTruthy();
    expect(attempts[1]?.requestId).toBe(attempts[0]?.requestId);
    expect(attempts.map(({ timeout }) => timeout)).toEqual([8000, 8000]);
  });

  it.each([502, 503, 504])('retries a GET after HTTP %s', async (status) => {
    let attempt = 0;
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      attempt += 1;
      if (attempt === 1) {
        const response = { ...successResponse(config), status, statusText: 'Unavailable' };
        throw new AxiosError('upstream unavailable', 'ERR_BAD_RESPONSE', config, {}, response);
      }
      return successResponse(config);
    });

    await expect(requestClient.get(`/test/retry-${status}`, { adapter })).resolves.toEqual({ ok: true });
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('stops after the second failed GET attempt', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('timeout', 'ECONNABORTED', config, {});
    });

    await expect(requestClient.get('/test/retry-limit', { adapter })).rejects.toMatchObject({
      message: 'timeout',
      status: 0,
    });
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('does not retry write requests', async () => {
    let timeout = 0;
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      timeout = config.timeout;
      throw new AxiosError('Network Error', 'ERR_NETWORK', config, {});
    });

    await expect(requestClient.post('/test/write', { value: 1 }, { adapter })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(timeout).toBe(30_000);
  });

  it.each([400, 401, 403, 409, 429, 500])('does not retry HTTP %s', async (status) => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      const response = { ...successResponse(config), status, statusText: 'Request failed' };
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, response);
    });

    await expect(requestClient.get(`/test/no-retry-${status}`, { adapter })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('does not retry or normalize a deliberately canceled request', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new CanceledError('canceled', config);
    });

    const error = await requestClient.get('/test/canceled', { adapter }).catch((error_) => error_);

    expect(isCanceledRequest(error)).toBe(true);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});

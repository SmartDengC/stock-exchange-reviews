import { useAppConfig } from '@vben/hooks';
import {
  AxiosHeaders,
  defaultResponseInterceptor,
  isCancel,
  RequestClient,
} from '@vben/request';

type UnauthorizedHandler = () => Promise<void> | void;

let unauthorizedHandler: UnauthorizedHandler | undefined;

const GET_TIMEOUT_MS = 8000;
const GET_RETRY_DELAY_MS = 300;
const RETRYABLE_NETWORK_CODES = new Set([
  'EAI_AGAIN',
  'ECONNABORTED',
  'ECONNRESET',
  'ERR_NETWORK',
  'ETIMEDOUT',
]);
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

class ApiError extends Error {
  readonly data: unknown;
  readonly status: number;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

const requestClient = new RequestClient({
  baseURL: apiURL,
  responseReturn: 'body',
  withCredentials: true,
});

requestClient.addRequestInterceptor({
  fulfilled: (config) => {
    const headers = AxiosHeaders.from(config.headers);
    if (!headers.has('X-Request-ID')) {
      headers.set('X-Request-ID', createRequestId());
    }
    if (!headers.has('X-Request-Attempt')) {
      headers.set('X-Request-Attempt', '1');
    }
    config.headers = headers;
    if (config.method?.toUpperCase() === 'GET' && config.responseType !== 'blob') {
      config.timeout = GET_TIMEOUT_MS;
    }
    return config;
  },
});

requestClient.addResponseInterceptor(
  defaultResponseInterceptor({
    codeField: 'code',
    dataField: 'data',
    successCode: 0,
  }),
);

requestClient.addResponseInterceptor({
  rejected: async (error) => {
    if (!shouldRetryGet(error)) throw error;

    const config = error.config;
    const headers = AxiosHeaders.from(config.headers);
    headers.set('X-Request-Attempt', '2');
    config.headers = headers;
    await new Promise((resolve) => setTimeout(resolve, GET_RETRY_DELAY_MS));
    return requestClient.instance.request(config);
  },
});

requestClient.addResponseInterceptor({
  rejected: async (error) => {
    if (error instanceof ApiError || isCanceledRequest(error)) throw error;

    const status = Number(error?.response?.status ?? 0);
    const data = error?.response?.data;
    const message =
      data?.message ?? data?.detail ?? error?.message ?? '请求失败，请稍后重试';
    const requestUrl = String(error?.config?.url ?? '');

    if (
      status === 401 &&
      !requestUrl.includes('/api/auth/login') &&
      !requestUrl.includes('/api/auth/session')
    ) {
      await unauthorizedHandler?.();
    }

    throw new ApiError(status, message, data);
  },
});

function createRequestId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isCanceledRequest(error: unknown) {
  return isCancel(error);
}

function shouldRetryGet(error: any) {
  if (isCanceledRequest(error)) return false;
  const config = error?.config;
  if (!config || config.method?.toUpperCase() !== 'GET') return false;

  const headers = AxiosHeaders.from(config.headers);
  if (Number(headers.get('X-Request-Attempt') ?? 1) >= 2) return false;

  const status = Number(error?.response?.status ?? 0);
  if (RETRYABLE_STATUSES.has(status)) return true;
  return !error?.response
    && (Boolean(error?.request) || RETRYABLE_NETWORK_CODES.has(error?.code));
}

function apiUrl(path: string) {
  const base = String(requestClient.getBaseUrl() ?? '').replace(/\/$/, '');
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

export {
  ApiError,
  apiUrl,
  isCanceledRequest,
  requestClient,
  setUnauthorizedHandler,
};

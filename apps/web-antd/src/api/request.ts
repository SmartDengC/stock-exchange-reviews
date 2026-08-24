import { useAppConfig } from '@vben/hooks';
import {
  defaultResponseInterceptor,
  RequestClient,
} from '@vben/request';

type UnauthorizedHandler = () => Promise<void> | void;

let unauthorizedHandler: UnauthorizedHandler | undefined;

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

requestClient.addResponseInterceptor(
  defaultResponseInterceptor({
    codeField: 'code',
    dataField: 'data',
    successCode: 0,
  }),
);

requestClient.addResponseInterceptor({
  rejected: async (error) => {
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

function apiUrl(path: string) {
  const base = String(requestClient.getBaseUrl() ?? '').replace(/\/$/, '');
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

export { ApiError, apiUrl, requestClient, setUnauthorizedHandler };

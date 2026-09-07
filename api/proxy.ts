const API_ORIGIN = 'https://hahadeng.cn';
const PROXY_REGION = 'hkg1';
const PROXY_PATH_QUERY = '__path';
const PROXY_REWRITE_QUERY = '__vcp';
const SLOW_REQUEST_MS = 1_000;

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export const config = {
  runtime: 'edge',
  regions: ['hkg1'],
};

function publicApiPath(request: Request): string | null {
  const path = new URL(request.url).searchParams.get(PROXY_PATH_QUERY);

  if (!path || path.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    return null;
  }

  return `/api/${path}`;
}

export function proxyTimeoutMs(request: Request): number {
  const pathname = publicApiPath(request) ?? new URL(request.url).pathname;
  const contentType = request.headers.get('content-type') ?? '';

  if (
    contentType.toLowerCase().startsWith('multipart/form-data') ||
    pathname.endsWith('.xlsx') ||
    (request.method === 'GET' && pathname.includes('/attachments/'))
  ) {
    return 60_000;
  }

  return request.method === 'GET' || request.method === 'HEAD' ? 10_000 : 28_000;
}

function upstreamHeaders(request: Request, requestId: string): Headers {
  const headers = new Headers(request.headers);

  for (const name of Array.from(headers.keys())) {
    if (HOP_BY_HOP_HEADERS.has(name) || name.startsWith('x-forwarded-') || name === 'host') {
      headers.delete(name);
    }
  }

  headers.set('X-Request-ID', requestId);
  return headers;
}

function errorResponse(status: 400 | 502 | 504, message: string, requestId: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-API-Proxy': PROXY_REGION,
      'X-Request-ID': requestId,
    },
  });
}

function isTimeout(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    ((error.name === 'AbortError' || error.name === 'TimeoutError') as boolean)
  );
}

function fallbackRequestId(): string {
  return `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function logProxyEvent(
  event: 'api_proxy_failed' | 'api_proxy_slow' | 'api_proxy_timeout',
  method: string,
  path: string,
  requestId: string,
  durationMs: number,
  status?: number,
): void {
  console.warn(event, {
    durationMs: Math.round(durationMs),
    method,
    path,
    requestId,
    ...(status === undefined ? {} : { status }),
  });
}

export default async function apiProxy(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const requestId = request.headers.get('X-Request-ID') || fallbackRequestId();
  const publicPath = publicApiPath(request);

  try {
    if (!publicPath) {
      return errorResponse(400, '代理路径无效', requestId);
    }

    const requestUrl = new URL(request.url);
    requestUrl.searchParams.delete(PROXY_PATH_QUERY);
    requestUrl.searchParams.delete(PROXY_REWRITE_QUERY);
    const upstreamUrl = new URL(publicPath, API_ORIGIN);
    upstreamUrl.search = requestUrl.search;
    const upstream = await fetch(upstreamUrl.toString(), {
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      headers: upstreamHeaders(request, requestId),
      method: request.method,
      redirect: 'manual',
      signal: AbortSignal.timeout(proxyTimeoutMs(request)),
    });
    const durationMs = Date.now() - startedAt;

    if (durationMs >= SLOW_REQUEST_MS) {
      logProxyEvent('api_proxy_slow', request.method, publicPath, requestId, durationMs, upstream.status);
    }

    const response = new Response(upstream.body, {
      headers: upstream.headers,
      status: upstream.status,
      statusText: upstream.statusText,
    });
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-API-Proxy', PROXY_REGION);
    if (!response.headers.has('X-Request-ID')) {
      response.headers.set('X-Request-ID', requestId);
    }
    return response;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const timedOut = isTimeout(error);
    logProxyEvent(
      timedOut ? 'api_proxy_timeout' : 'api_proxy_failed',
      request.method,
      publicPath ?? '/api',
      requestId,
      durationMs,
    );
    return errorResponse(
      timedOut ? 504 : 502,
      timedOut ? '后端响应超时，请稍后重试' : '后端连接失败，请稍后重试',
      requestId,
    );
  }
}

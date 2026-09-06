const API_ORIGIN = 'https://hahadeng.cn';
const PROXY_REGION = 'hkg1';
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

export function proxyTimeoutMs(request: Request): number {
  const pathname = new URL(request.url).pathname;
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

function errorResponse(status: 502 | 504, message: string, requestId: string): Response {
  return Response.json(
    { message },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-API-Proxy': PROXY_REGION,
        'X-Request-ID': requestId,
      },
    },
  );
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function logProxyEvent(
  event: 'api_proxy_failed' | 'api_proxy_slow' | 'api_proxy_timeout',
  request: Request,
  requestId: string,
  durationMs: number,
  status?: number,
): void {
  console.warn(event, {
    durationMs: Math.round(durationMs),
    method: request.method,
    path: new URL(request.url).pathname,
    requestId,
    ...(status === undefined ? {} : { status }),
  });
}

export default async function apiProxy(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
  const startedAt = performance.now();
  const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, API_ORIGIN).toString();

  try {
    const upstream = await fetch(upstreamUrl, {
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      headers: upstreamHeaders(request, requestId),
      method: request.method,
      redirect: 'manual',
      signal: AbortSignal.timeout(proxyTimeoutMs(request)),
    });
    const durationMs = performance.now() - startedAt;

    if (durationMs >= SLOW_REQUEST_MS) {
      logProxyEvent('api_proxy_slow', request, requestId, durationMs, upstream.status);
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
    const durationMs = performance.now() - startedAt;
    const timedOut = isTimeout(error);
    logProxyEvent(timedOut ? 'api_proxy_timeout' : 'api_proxy_failed', request, requestId, durationMs);
    return errorResponse(
      timedOut ? 504 : 502,
      timedOut ? '后端响应超时，请稍后重试' : '后端连接失败，请稍后重试',
      requestId,
    );
  }
}

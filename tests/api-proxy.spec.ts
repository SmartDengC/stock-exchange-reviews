// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import apiProxy, { proxyTimeoutMs } from '../api/proxy';

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', originalFetch);
});

describe('regional API proxy', () => {
  it('forwards the path, query, session cookie, origin, and request ID to the API origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"loggedIn":true}', {
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'request-123' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiProxy(
      new Request('https://se.vdcc.cn/api/proxy?__path=auth/session&__vcp=auth/session&trace=1&path=keep-me', {
        headers: {
          Cookie: 'trading_session=secret-cookie',
          Host: 'se.vdcc.cn',
          Origin: 'https://se.vdcc.cn',
          Connection: 'keep-alive',
          'X-Forwarded-For': '198.51.100.1',
          'X-Forwarded-Proto': 'https',
          'X-Request-ID': 'request-123',
        },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hahadeng.cn/api/auth/session?trace=1&path=keep-me',
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get('cookie')).toBe('trading_session=secret-cookie');
    expect(headers.get('origin')).toBe('https://se.vdcc.cn');
    expect(headers.get('x-request-id')).toBe('request-123');
    expect(headers.has('host')).toBe(false);
    expect(headers.has('connection')).toBe(false);
    expect(headers.has('x-forwarded-for')).toBe(false);
    expect(headers.has('x-forwarded-proto')).toBe(false);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ loggedIn: true });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-api-proxy')).toBe('hnd1');
    expect(response.headers.get('x-request-id')).toBe('request-123');
  });

  it('preserves an upstream session cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"loggedIn":true}', {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'trading_session=next-cookie; HttpOnly; Path=/',
          },
          status: 200,
        }),
      ),
    );

    const response = await apiProxy(new Request('https://se.vdcc.cn/api/proxy?__path=auth/login'));

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('trading_session=next-cookie');
  });

  it('uses the selected upstream timeout budgets', () => {
    expect(proxyTimeoutMs(new Request('https://se.vdcc.cn/api/proxy?__path=trading/trades'))).toBe(10_000);
    expect(
      proxyTimeoutMs(
        new Request('https://se.vdcc.cn/api/proxy?__path=trading/trades', { method: 'POST', body: '{}' }),
      ),
    ).toBe(28_000);
    expect(
      proxyTimeoutMs(
        new Request('https://se.vdcc.cn/api/proxy?__path=trading/trades/1/attachments', {
          body: new FormData(),
          method: 'POST',
        }),
      ),
    ).toBe(60_000);
    expect(proxyTimeoutMs(new Request('https://se.vdcc.cn/api/proxy?__path=trading/export.xlsx'))).toBe(60_000);
    expect(
      proxyTimeoutMs(new Request('https://se.vdcc.cn/api/proxy?__path=trading/trades/1/attachments/2')),
    ).toBe(60_000);
  });

  it('passes multipart request bodies through to the API origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const form = new FormData();
    form.append('file', new Blob(['image']), 'chart.png');
    const request = new Request('https://se.vdcc.cn/api/proxy?__path=trading/trades/trade-1/attachments', {
      body: form,
      method: 'POST',
    });

    await apiProxy(request);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.body).toBe(request.body);
    expect(new Headers(init?.headers).get('content-type')).toContain('multipart/form-data');
  });

  it('returns a request-correlated 504 without logging private request data after an upstream timeout', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')));

    const response = await apiProxy(
      new Request('https://se.vdcc.cn/api/proxy?__path=trading/trades&token=secret-query', {
        headers: { Cookie: 'trading_session=secret-cookie', 'X-Request-ID': 'request-504' },
      }),
    );

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({ message: '后端响应超时，请稍后重试' });
    expect(response.headers.get('x-request-id')).toBe('request-504');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret-query');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret-cookie');
  });

  it('returns 502 without logging private request data when the upstream connection fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('connection failed')));

    const response = await apiProxy(
      new Request('https://se.vdcc.cn/api/proxy?__path=trading/trades&token=secret-query', {
        headers: { Cookie: 'trading_session=secret-cookie', 'X-Request-ID': 'request-502' },
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: '后端连接失败，请稍后重试' });
    expect(response.headers.get('x-request-id')).toBe('request-502');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret-query');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret-cookie');
  });
});

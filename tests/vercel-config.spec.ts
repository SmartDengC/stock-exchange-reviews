import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type VercelConfig = {
  headers: Array<{
    headers: Array<{ key: string; value: string }>;
    source: string;
  }>;
  rewrites: Array<{ destination: string; source: string }>;
};

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig;
const productionEnv = readFileSync(
  resolve(process.cwd(), 'apps/web-antd/.env.production'),
  'utf8',
);

describe('Vercel proxy configuration', () => {
  it('proxies API requests before applying the SPA fallback', () => {
    expect(config.rewrites).toEqual([
      {
        destination: 'https://hahadeng.cn/api/:path*',
        source: '/api/:path*',
      },
      { destination: '/index.html', source: '/(.*)' },
    ]);
  });

  it('prevents private API responses from being cached', () => {
    expect(config.headers).toContainEqual({
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'x-vercel-enable-rewrite-caching', value: '0' },
      ],
      source: '/api/:path*',
    });
  });

  it('keeps browser API requests on the Vercel origin', () => {
    expect(productionEnv).toMatch(/^VITE_GLOB_API_URL=$/m);
  });
});

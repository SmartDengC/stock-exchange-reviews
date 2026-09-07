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

describe('Vercel static deployment configuration', () => {
  it('uses the filesystem API function and reserves rewrites for the SPA fallback', () => {
    expect(config.rewrites).toEqual([
      { destination: '/api/proxy?__path=:__vcp', source: '/api/:__vcp*' },
      { destination: '/index.html', source: '/(.*)' },
    ]);
    expect(config.headers).toContainEqual({
      headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      source: '/api/:path*',
    });
  });

  it('keeps browser API requests on the Vercel origin and runs the proxy in Hong Kong', () => {
    expect(productionEnv).toMatch(/^VITE_GLOB_API_URL=$/m);
    expect(readFileSync(resolve(process.cwd(), 'api/proxy.ts'), 'utf8')).toContain(
      "regions: ['hkg1']",
    );
  });
});

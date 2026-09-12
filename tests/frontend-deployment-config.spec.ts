import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const dockerfile = readFileSync(resolve(root, 'scripts/deploy/Dockerfile'), 'utf8');
const nginxConfig = readFileSync(resolve(root, 'scripts/deploy/nginx.conf'), 'utf8');
const compose = readFileSync(resolve(root, 'deploy/tencent/compose.frontend.yaml'), 'utf8');

describe('frontend server deployment configuration', () => {
  it('builds the web-antd application and serves its dist output', () => {
    expect(dockerfile).toContain('RUN pnpm run build');
    expect(dockerfile).toContain(
      'COPY --from=builder /app/apps/web-antd/dist /usr/share/nginx/html',
    );
    expect(dockerfile).not.toContain('/app/playground/dist');
  });

  it('proxies API requests to the configurable HTTPS backend', () => {
    expect(nginxConfig).toContain('https://__BACKEND_API_HOST__');
    expect(nginxConfig).toContain('rewrite ^/api/health/live$ /health/live break;');
    expect(nginxConfig).toContain('proxy_ssl_server_name on;');
    expect(nginxConfig).toContain('proxy_set_header Cookie $http_cookie;');
    expect(nginxConfig).toContain('proxy_set_header X-Forwarded-Proto $scheme;');
    expect(nginxConfig).toContain('proxy_set_header X-Request-ID $http_x_request_id;');
    expect(nginxConfig).toContain('proxy_read_timeout 120s;');
    expect(nginxConfig).toContain('proxy_read_timeout 300s;');
    expect(nginxConfig).toContain('proxy_request_buffering off;');
  });

  it('exposes the frontend on host port 8090 and passes the backend host at build time', () => {
    expect(compose).toContain('dockerfile: scripts/deploy/Dockerfile');
    expect(compose).toContain('BACKEND_API_HOST: ${BACKEND_API_HOST:-hahadeng.cn}');
    expect(compose).toContain('"${FRONTEND_PORT:-8090}:8080"');
  });
});

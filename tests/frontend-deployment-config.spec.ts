import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const dockerfile = readFileSync(resolve(root, 'scripts/deploy/Dockerfile'), 'utf8');
const nginxConfig = readFileSync(resolve(root, 'scripts/deploy/nginx.conf'), 'utf8');
const mainEntry = readFileSync(resolve(root, 'apps/web-antd/src/main.ts'), 'utf8');
const compose = readFileSync(resolve(root, 'deploy/tencent/compose.frontend.yaml'), 'utf8');

describe('frontend server deployment configuration', () => {
  it('builds the web-antd application and serves its dist output', () => {
    expect(dockerfile).not.toContain('--mount=type=cache');
    expect(dockerfile).toContain('fetch-retries 5');
    expect(dockerfile).toContain('fetch-timeout 300000');
    expect(dockerfile).toContain('network-concurrency 4');
    expect(dockerfile).toContain('RUN pnpm run build');
    expect(dockerfile).toContain(
      'COPY --from=builder /app/apps/web-antd/dist /usr/share/nginx/html',
    );
    expect(dockerfile).not.toContain('/app/playground/dist');
    expect(dockerfile).toContain('ARG SINA_RELAY_ALLOW_IP=127.0.0.1');
    expect(dockerfile).toContain('ARG SINA_RELAY_PORT=8091');
    expect(dockerfile).toContain('__SINA_RELAY_ALLOW_IP__');
    expect(dockerfile).toContain('EXPOSE 8080 8081');
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

  it('keeps the entrypoint fresh and never falls back to HTML for hashed assets', () => {
    expect(nginxConfig).toContain('location = /index.html');
    expect(nginxConfig).toContain('Cache-Control "no-store, no-cache, must-revalidate"');
    expect(nginxConfig).toContain('location ~* ^/(?:js|jse|css)/');
    expect(nginxConfig).toContain('try_files $uri =404;');
    expect(nginxConfig).toContain('Cache-Control "public, max-age=31536000, immutable"');
  });

  it('reloads once when a deployed chunk hash is stale', () => {
    expect(mainEntry).toContain('vite:preloadError');
    expect(mainEntry).toContain('market-diary:asset-reload');
  });

  it('restricts the Sina quote relay to the configured backend IP', () => {
    expect(nginxConfig).toContain('listen 8081;');
    expect(nginxConfig).toContain('location ~ ^/sina-quotes/');
    expect(nginxConfig).toContain('allow __SINA_RELAY_ALLOW_IP__;');
    expect(nginxConfig).toContain('deny all;');
    expect(nginxConfig).toContain('if ($args != "") { return 404; }');
    expect(nginxConfig).toContain('resolver 127.0.0.11 valid=300s ipv6=off;');
    expect(nginxConfig).toContain('proxy_ssl_server_name on;');
    expect(nginxConfig).toContain('proxy_ssl_name hq.sinajs.cn;');
    expect(nginxConfig).toContain('proxy_pass_request_headers off;');
    expect(nginxConfig).toContain('proxy_set_header Referer https://finance.sina.com.cn/;');
    expect(nginxConfig).toContain('proxy_set_header User-Agent market-diary/1.0;');
    expect(nginxConfig).toContain('proxy_read_timeout 5s;');
  });

  it('exposes the frontend on host port 8090 and passes the backend host at build time', () => {
    expect(compose).toContain('dockerfile: scripts/deploy/Dockerfile');
    expect(compose).toContain('BACKEND_API_HOST: ${BACKEND_API_HOST:-hahadeng.cn}');
    expect(compose).toContain('NPM_REGISTRY: ${NPM_REGISTRY:-https://registry.npmjs.org/}');
    expect(compose).toContain('"${FRONTEND_PORT:-8090}:8080"');
    expect(compose).toContain('SINA_RELAY_ALLOW_IP: ${SINA_RELAY_ALLOW_IP:-127.0.0.1}');
    expect(compose).toContain('SINA_RELAY_PORT: ${SINA_RELAY_PORT:-8091}');
    expect(compose).toContain('"${SINA_RELAY_PORT:-8091}:8081"');
  });
});

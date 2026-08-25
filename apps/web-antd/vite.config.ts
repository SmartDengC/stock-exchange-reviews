import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  // 代理目标：默认连本地后端，设为远程 URL 时连远程。
  // 用法：VITE_DEV_API_PROXY_TARGET=https://se.vdcc.cn pnpm run dev

  const proxyTarget = process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:8000';

  return {
    application: {},
    vite: {
      server: {
        host: 'localhost',
        proxy: {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
            secure: true,
            cookieDomainRewrite: 'localhost',
          },
        },
      },
    },
  };
});

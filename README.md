# 市场日记 · 股市复盘研究终端

Nuxt 前端负责研究复盘与交易复盘界面，所有认证、业务数据、附件和 Excel 导出均由独立的 Trading Cloud（FastAPI）提供。浏览器直接访问 Trading Cloud，不经过 Nuxt/Nitro API 中转。

> 本项目仅用于个人研究与历史复盘，不构成投资建议。

## 本地联调

先启动 Trading Cloud，并确认：

```dotenv
TRADING_FRONTEND_ORIGIN=http://localhost:3000
TRADING_PUBLIC_BASE_URL=http://localhost:8000
TRADING_SESSION_SECURE=false
TRADING_SESSION_COOKIE_DOMAIN=
```

后端就绪检查：

```bash
curl http://localhost:8000/health/ready
```

在 `.env.local` 中设置 `NUXT_PUBLIC_TRADING_API_BASE=http://localhost:8000`（文件已存在时不要覆盖其中其他配置），然后启动 Nuxt：

```bash
pnpm install
pnpm exec dotenv --no-expand -e .env -e .env.local -- pnpm run dev
```

打开 `http://localhost:3000`。前端与 API 必须都使用 `localhost`，不要将其中一个换成 `127.0.0.1`，否则浏览器不会按预期共享登录 Cookie。

前端唯一必需的环境变量是：

```dotenv
NUXT_PUBLIC_TRADING_API_BASE=http://localhost:8000
```

## 架构与接口

- Nuxt SSR 页面通过统一 `$api` 客户端访问 FastAPI。
- 浏览器请求携带 `credentials: "include"`；SSR 请求会把浏览器 Cookie 转发给 FastAPI。
- 登录状态由 `/api/auth/login`、`/api/auth/session` 和 `/api/auth/logout` 管理，七天有效期以后端会话为准。
- 研究复盘、交易、日复盘、设置、附件与导出均直接访问 `NUXT_PUBLIC_TRADING_API_BASE`。
- 图片上传使用单次 `multipart/form-data`，单张最大 15 MB；图片查看和 Excel 下载使用绝对 API 地址。
- 前端不包含 Neon、Drizzle、Vercel Blob、Nitro 业务 API 或本地认证实现。

主要页面：

- `/`：复盘总览
- `/report/weekly/YYYY-Wxx`：周复盘详情
- `/report/daily/YYYY-MM-DD`：日复盘详情
- `/trading`：交易总览
- `/trading/trades`：交易台账
- `/trading/daily/YYYY-MM-DD`：每日复盘
- `/trading/analytics`：统计洞察
- `/trading/settings`：字典、汇率和 Excel 导出

## 生产配置

假设前端为 `https://app.example.com`，API 为 `https://api.example.com`。

前端：

```dotenv
NUXT_PUBLIC_TRADING_API_BASE=https://api.example.com
```

Trading Cloud：

```dotenv
TRADING_FRONTEND_ORIGIN=https://app.example.com
TRADING_PUBLIC_BASE_URL=https://api.example.com
TRADING_SESSION_SECURE=true
TRADING_SESSION_COOKIE_DOMAIN=example.com
```

前端与 API 必须位于同一可信主域。切换生产流量前，先完成数据迁移并确认 `https://api.example.com/health/ready` 正常。

## 常用命令

```bash
pnpm run dev       # 启动本地开发服务器
pnpm run lint      # ESLint
pnpm run typecheck # Nuxt/TypeScript 类型检查
pnpm test          # Vitest
pnpm run build     # 生产构建
```

## Vercel 部署

| 设置项 | 值 |
| --- | --- |
| Framework Preset | `Nuxt.js` |
| Root Directory | `.` |
| Install Command | `npm install --registry=https://registry.npmjs.org/` |
| Build Command | `npm run build` |
| Output Directory | 留空 |
| Node.js Version | `22.x` |

在 Vercel Project Settings 中设置生产 `NUXT_PUBLIC_TRADING_API_BASE`。前端不再需要数据库、Blob 或管理员密码环境变量。

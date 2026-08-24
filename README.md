# 市场日记 · Vben 研究终端

基于 Vue Vben Admin v5.7.0 `web-antd` 的私有研究与交易复盘 SPA。认证、研究资料、交易、附件和 Excel 导出仍由 Trading Cloud（FastAPI）提供，外部 API 和业务规则未改变。

> 本项目仅用于个人研究与历史复盘，不构成投资建议。

## 环境要求

- Node.js 22.18.x
- pnpm 11.16.x（通过 Corepack 使用）
- Trading Cloud：`http://localhost:8000`
- 前端：`http://localhost:3000`

不要混用 `localhost` 与 `127.0.0.1`，否则 HttpOnly 会话 Cookie 无法按预期工作。

## 本地启动

先配置 Trading Cloud：

```dotenv
TRADING_FRONTEND_ORIGIN=http://localhost:3000
TRADING_PUBLIC_BASE_URL=http://localhost:8000
TRADING_SESSION_SECURE=false
TRADING_SESSION_COOKIE_DOMAIN=
```

确认后端就绪：

```bash
curl http://localhost:8000/health/ready
```

前端开发环境已在 `apps/web-antd/.env.development` 使用：

```dotenv
VITE_GLOB_API_URL=http://localhost:8000
```

安装并启动：

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

打开 `http://localhost:3000`。

## 架构

- `apps/web-antd`：Vue 3 + Vite + Vue Router + Pinia + Ant Design Vue 的 SPA。
- `packages`、`internal`、`scripts`：Vben v5.7.0 运行及构建所需的精简 workspace。
- `tests`：Vitest 单元和组件测试。
- `reviews`：历史 Markdown 研究资料。
- 所有业务请求经 `src/api` 的 Vben Request 客户端，统一启用 `withCredentials`。
- Session Store 只保存会话视图；认证凭证始终是 Trading Cloud 的 HttpOnly Cookie，不使用 Token 或刷新 Token。
- 附件、图片预览和 Excel 下载通过 `apiUrl` 生成绝对 Trading Cloud URL。
- Markdown 在渲染前继续使用 `sanitize-html` 清理。

保留页面：

- `/`、`/research/rules`、`/research/weekly`、`/research/daily`
- `/research/edit/**`、`/report/:kind/:slug`
- `/trading`、`/trading/trades`、`/trading/daily/:date`
- `/trading/analytics`、`/trading/settings`
- `/trading/login` 会重定向至 `/login`

## 业务约束

- `trades` 与 `daily_reviews` 更新继续携带 `version`；409 时保留表单输入并展示冲突信息。
- 交易日期按 `Asia/Shanghai` 处理。
- CNY 结算时 `fxToCny` 固定为 `"1"`。
- 每笔交易最多 10 张 JPEG/PNG/WebP；单张最大 15 MB，逐张 multipart 上传。
- 盈亏预览复用 `apps/web-antd/src/shared/trading-calculator.ts`，最终结果以后端重算为准。

## 验证命令

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
pnpm run check
```

## Vercel 部署

仓库根目录的 `vercel.json` 会构建 `apps/web-antd`、发布其 `dist`，并为深层 URL 提供 SPA fallback。Vercel 项目需设置：

```dotenv
VITE_GLOB_API_URL=https://api.example.com
```

生产域名保持不变时，Trading Cloud 的 `TRADING_FRONTEND_ORIGIN` 与 Cookie 域无需因本次框架迁移调整。切换前应保留最后一个 Nuxt 部署作为回滚点。

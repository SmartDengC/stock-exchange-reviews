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

前端通过 Vite dev proxy 转发 `/api` 请求，默认连本地后端，也可一行命令切换到远程服务器后端。两种模式都无需改代码，只改启动命令。

### 前置条件

- Node.js 22.18.x
- pnpm 11.16.x（通过 Corepack 使用）
- 本地后端（Trading Cloud FastAPI）监听 `http://localhost:8000`

### 方式一：连本地后端（默认）

```bash
pnpm run dev
```

- Vite proxy 把 `/api/**` 转发到 `http://localhost:8000`
- 适用于本地后端正在运行的开发场景

### 方式二：连远程服务器后端

```bash
VITE_DEV_API_PROXY_TARGET=https://se.xxxx.cn pnpm run dev
```

- Vite proxy 把 `/api/**` 转发到 `https://se.xxxx.cn`
- 适用于本地无后端、直接连远程服务器的场景
- Cookie 经 `cookieDomainRewrite: 'localhost'` 改写后设到 `localhost`，浏览器自动携带

### 原理

| 配置项                      | 文件                             | 作用                              |
| --------------------------- | -------------------------------- | --------------------------------- |
| `VITE_GLOB_API_URL`         | `apps/web-antd/.env.development` | 留空，让请求走相对路径 `/api/...` |
| `VITE_DEV_API_PROXY_TARGET` | `apps/web-antd/vite.config.ts`   | 环境变量，控制 proxy target       |
| `server.proxy['/api']`      | `apps/web-antd/vite.config.ts`   | Vite dev server 代理配置          |

`.env.development` 里 `VITE_GLOB_API_URL=` 留空，axios 请求走相对路径 `/api/...`，被 Vite dev server 拦截转发到 `proxyTarget`。

> ⚠️ 改动 `.env.development` 或 `vite.config.ts` 后必须重启 dev server（Ctrl-C 后重新 `pnpm run dev`），Vite 不会热重载这些文件。

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

## 服务器 Docker 部署

前端可以部署在独立服务器，浏览器访问前端服务器的地址，Nginx 再把同源的 `/api/*` 转发到已部署的 Trading Cloud Caddy。物理服务器不同，但浏览器只看到一个 origin，因此现有 HttpOnly 会话 Cookie、附件和 Excel 下载不需要改成跨域调用。

### 前端服务器

在 `deploy/tencent` 目录准备 Compose 参数。`BACKEND_API_HOST` 只填写后端 Caddy 的域名，不要填写 `https://` 或路径：

```bash
cd deploy/tencent
cp .env.example .env
export BACKEND_API_HOST=hahadeng.cn
export FRONTEND_PORT=8090

docker compose -f compose.frontend.yaml config
docker compose -f compose.frontend.yaml build
docker compose -f compose.frontend.yaml up -d
docker compose -f compose.frontend.yaml ps
```

验证静态页面和同源 API 代理：

```bash
curl -I http://前端服务器IP:8090
curl -i http://前端服务器IP:8090/api/health/live
```

前端镜像构建时会把 `BACKEND_API_HOST` 注入 Nginx。普通 API 请求读取超时为 120 秒，附件上传、附件下载和 Excel 导出为 300 秒。

### 后端服务器

在 `trading-cloud/deploy/aliyun/.env` 中填写前端服务器的实际公开地址：

```dotenv
TRADING_FRONTEND_ORIGINS=https://se.vdcc.cn,http://前端服务器IP:8090,http://localhost:8080
TRADING_PUBLIC_BASE_URL=http://前端服务器IP:8090
TRADING_SESSION_COOKIE_DOMAIN=
TRADING_SESSION_SECURE=false
```

修改后重建容器配置：

```bash
cd trading-cloud/deploy/aliyun
docker compose up -d --force-recreate api caddy
docker compose ps
docker compose logs --tail=100 api caddy
```

`SESSION_SECURE=false` 只适用于临时 HTTP IP、内网或 VPN。公网正式部署应给前端服务器绑定域名并启用 HTTPS，然后将两个地址改为 HTTPS 域名、恢复 `TRADING_SESSION_SECURE=true`。后端 FastAPI 的 8000 端口继续不对外暴露，后端防火墙可只允许前端服务器访问 443。

## Vercel 部署

仓库根目录的 `vercel.json` 会构建 `apps/web-antd`、发布其 `dist`，并按以下顺序处理请求：

1. 将 `https://se.xxxx.cn/api/**` 同源代理到 `https://hahaxxxx.cn/api/**`。
2. 对 API 响应禁用 Vercel 缓存。
3. 其余深层 URL 返回 SPA 的 `index.html`。

生产构建使用：

```dotenv
VITE_GLOB_API_URL=
```

如果 Vercel Project Settings 中已经存在同名变量，应删除该变量或将 Production 值设为空字符串，否则会覆盖仓库内的 `.env.production`。

Trading Cloud 服务器使用：

```dotenv
TRADING_FRONTEND_ORIGINS=https://se.vdcc.cn,http://前端服务器IP:8090,http://localhost:8080
TRADING_PUBLIC_BASE_URL=https://se.xxxx.cn
TRADING_SESSION_SECURE=true
TRADING_SESSION_COOKIE_DOMAIN=
```

修改后需重启 FastAPI。Cookie 继续保持 HttpOnly、Secure、SameSite=Lax 和 host-only。阿里云只公开 Caddy 的 80/443，FastAPI 的 8000 不映射到宿主机。双云部署步骤见 `trading-cloud/deploy/README.md`。切换前应保留上一个 Vercel 部署作为回滚点。

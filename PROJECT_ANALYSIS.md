# stock-exchange-reviews 架构说明

## 定位

本仓库是“市场日记”的 Vben Admin v5.7.0 `web-antd` SPA，提供研究复盘、交易台账、每日复盘、统计洞察、附件管理和 Excel 导出界面。认证、业务持久化和文件存储由独立的 `trading-cloud` FastAPI 服务负责。

## 请求链路

```text
浏览器 / Vue SPA
        │
        │  Vben Request + withCredentials
        ▼
Trading Cloud FastAPI
        ├── PostgreSQL：业务数据、乐观锁、服务端会话
        └── MinIO：私有交易截图
```

- API Base 来自 `VITE_GLOB_API_URL`。
- 本地使用 `http://localhost:3000` 与 `http://localhost:8000`。
- 生产前端和 API 部署在同一主域的不同子域，通过 HttpOnly Cookie 保持登录状态。
- 401 会清空本地会话状态，并把受保护页面导航到登录页。

## 关键实现

- `apps/web-antd/src/api/request.ts`：统一 API 客户端、凭证、401 和乐观锁错误传递。
- `apps/web-antd/src/store/auth.ts`：FastAPI Cookie 会话状态。
- `apps/web-antd/src/api/trading.ts`：附件和下载绝对 URL、交易接口适配。
- `apps/web-antd/src/components/trade-form-modal.vue`：交易保存与 multipart 截图上传。
- `apps/web-antd/src/components/trade-detail-drawer.vue`：附件查看、排序、封面和删除。
- `apps/web-antd/src/shared/trading-calculator.ts`：前端交易结果预览；服务端仍是最终计算来源。

## 已移除的运行时职责

前端不再包含 Nitro 业务 API、Neon/Drizzle 数据层、Vercel Blob 上传、Excel 生成或本地认证会话。数据库 schema、迁移、数据迁移和备份均在 `trading-cloud` 项目维护。

## 验证

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
```

联调前还应确认 Trading Cloud 的 `/health/ready` 返回成功，并验证登录刷新、CRUD、409、附件生命周期、Excel 下载和退出撤销。

<INSTRUCTIONS>
1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly when uncertain.
- Present materially different interpretations instead of choosing silently.
- Push back when a simpler approach is sufficient.
- Stop and ask when ambiguity would materially change the result.

2. Simplicity First
Use the minimum code that solves the requested problem. Do not add speculative features, single-use abstractions, or impossible-case handling.

3. Surgical Changes
Touch only what the task requires. Preserve existing style and unrelated work. Remove only imports, variables, functions, and files made obsolete by the current change.

4. Goal-Driven Execution
Turn work into verifiable outcomes, state a brief plan for multi-step tasks, and loop until the relevant tests pass.
</INSTRUCTIONS>

# 市场日记 · 研究终端

## 快速启动

```bash
pnpm run dev
pnpm run build
pnpm test
```

## 架构要点

- 前端是 Vben Admin v5.7.0 `web-antd` 的标准 Vite SPA，不包含业务 API。
- 认证、复盘、交易、附件和 Excel 导出全部由 Trading Cloud FastAPI 提供。
- 所有请求使用 `apps/web-antd/src/api` 的 Vben Request 客户端并携带浏览器凭证。
- 本地固定使用 `http://localhost:3000` 和 `http://localhost:8000`，不要混用 `127.0.0.1`。
- 前端环境变量为 `VITE_GLOB_API_URL`。

### 登录验证

- 全站需要登录后访问。
- 登录状态来自 Trading Cloud 的 PostgreSQL 服务端会话。
- Cookie 为 HttpOnly；前端通过 `/api/auth/session` 刷新状态。
- 会话有效期以后端配置为准，前端不维护独立超时计时器。

### 乐观锁与业务规则

- `trades` 和 `daily_reviews` 更新携带 `version`，冲突返回 409。
- 交易日期使用 `Asia/Shanghai`。
- CNY 结算时 `fxToCny` 为 `"1"`。
- 每笔交易最多 10 张 JPEG/PNG/WebP；单张最多 15 MB，使用 multipart 上传。

### 盈亏计算

前端预览位于 `shared/trading-calculator.ts`，最终结果由 Trading Cloud 重新计算：

```text
毛盈亏 = (exitPrice - entryPrice) × direction × positionSize
净盈亏 = 毛盈亏 - fees
人民币盈亏 = 净盈亏 × fxToCny
R 倍数 = 净盈亏 / plannedRiskAmount
```

## 修改前必读

1. 业务请求只能经 `src/api` 的 `requestClient`，不要增加本地 API fallback。
2. 附件与下载地址必须通过 `apiUrl` 转换为绝对 Trading Cloud URL。
3. Markdown 展示继续通过 `sanitize-html` 清理。
4. 后端 schema、迁移和数据导入变更应在 `trading-cloud` 仓库完成。

## 文件组织

```text
apps/web-antd/       # Vben web-antd SPA
packages/            # 必需的 Vben 共享包
internal/            # Vben 构建与配置包
tests/               # Vitest 单元测试
reviews/             # 历史 Markdown 资料
```

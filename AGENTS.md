# 市场日记 · 股市复盘研究终端

## 快速启动

```bash
# 本地开发（同时加载 .env 和 .env.local）
pnpm exec dotenv --no-expand -e .env -e .env.local -- pnpm run dev

# 构建（自动同步 reviews/ 目录）
pnpm run build

# 测试（含 review 同步 + 单元测试）
pnpm test
```

## 关键命令

| 命令 | 说明 |
|------|------|
| `pnpm run auth:hash` | 生成管理员密码 scrypt 哈希 |
| `pnpm run db:migrate` | 执行 Neon Postgres 迁移 |
| `pnpm trading:import` | Excel 导入 dry-run |
| `pnpm trading:import -- --apply` | Excel 导入并写入数据库 |

## 架构要点

### 双模块设计
- **公开复盘**：`reviews/` Markdown 文件 → GitHub Contents API 读写 → 构建时预渲染
- **私有交易**：Neon Postgres + Vercel Private Blob → 仅管理员可访问 → 运行时 SSR

### 构建流程
1. `prebuild` 钩子执行 `scripts/sync-reviews.mjs`，生成 `app/lib/generated-reviews.ts`
2. Nuxt Nitro 预渲染 `/` 和 `/report/**` 路由
3. `/trading/**` 路由为 SSR，返回 `private, no-store` 响应头

### 环境变量优先级
```
进程环境变量 > .env > .env.local
```
使用 `dotenv-cli --no-expand` 防止密码中的 `$` 被展开。

## 数据库与并发

### 乐观锁机制
- 每条 `trades` / `daily_reviews` 记录有 `version` 字段
- 更新时校验 `version`，失败返回 409 冲突
- 软删除使用 `deletedAt`，查询时默认 `IS NULL`

### 导入去重
- Excel 导入使用 `source_file_hash` (SHA-256) + `source_row` 唯一索引
- `import_batches` 表追踪批次状态，防止重复导入

### 附件限制
- 每笔交易最多 10 张截图（`trade_attachments`）
- 使用 `pathname` 唯一索引防止重复上传

## 业务逻辑

### 盈亏计算（`shared/trading-calculator.ts`）
```typescript
// 使用 decimal.js，精度 40 位
毛盈亏 = (exitPrice - entryPrice) × direction × positionSize
净盈亏 = 毛盈亏 - fees
人民币盈亏 = 净盈亏 × fxToCny
R 倍数 = 净盈亏 / plannedRiskAmount
```

### 会话超时
- 管理员会话 30 分钟空闲超时（`shared/auth-session.ts`）
- 前端 `admin-session-timeout.client.ts` 在输入时续期
- 登录接口有 350ms 延迟防止暴力枚举

## 测试约定

```bash
# 单元测试（vitest + happy-dom）
pnpm run test:unit

# 测试 mocks
# - tests/mocks/nuxt-imports.ts 模拟 Nuxt 运行时 API
```

## 修改前必读

1. **交易计算器**：任何涉及 `grossPnl`/`netPnl`/`rMultiple` 的修改需同步 `shared/trading-calculator.ts` 和 `scripts/import-trading-workbook.mjs` 中的计算逻辑
2. **Schema 变更**：修改 `db/schema.ts` 后执行 `pnpm run db:generate` 生成迁移
3. **Markdown 安全**：公开复盘内容通过 `sanitize-html` 清理，不要绕过
4. **GitHub Token**：需 fine-grained token，仅授权当前仓库，Contents 权限为 Read and write

## 文件组织

```
app/                 # Nuxt 页面、组件、composables
app/lib/             # 业务逻辑（reviews.ts, trading.ts, markdown-sanitize.ts）
db/                  # Drizzle schema
drizzle/             # 数据库迁移
server/api/          # API 端点
server/utils/        # 服务端工具（trading-repository, review-storage, admin-password）
shared/              # 共享类型和工具（types/, trading-calculator, auth-session）
tests/               # Vitest 单元测试
scripts/             # 构建脚本（sync-reviews, import-trading-workbook）
reviews/             # 原始 Markdown 复盘文件
```

## 常见陷阱

- **环境变量**：Vercel 部署需配置 `NUXT_*` 前缀变量，但 `DATABASE_URL` 和 `BLOB_READ_WRITE_TOKEN` 也会被自动识别
- **时区**：交易日期使用 `Asia/Shanghai`，见 `shared/trading-date-range.ts`
- **汇率**：CNY 结算时 `fxToCny` 强制为 `"1"`，其他币种需传入
- **版本冲突**：前端编辑时需携带 `version` 字段，409 错误应提示用户重新加载

# 市场日记 · 股市复盘研究终端 - 项目架构分析

## 项目概览

**项目名称**: `market-diary-terminal`  
**版本**: 0.1.0  
**框架**: Nuxt 4 + Vue 3  
**技术栈**: TypeScript, Drizzle ORM, Neon Postgres, Vercel Private Blob, GitHub API  
**Node 版本要求**: >= 22.13.0

这是一个**混合架构**的个人市场研究系统，包含两个核心模块：
1. **公开市场研究终端** - 展示日报/周报，基于 GitHub 存储
2. **私有交易复盘系统** - 管理逐笔交易、日复盘和截图，基于数据库存储

---

## 核心功能模块

### 1. 公开研究模块 (Reviews)

#### 功能特点
- **自动发现与展示**：自动扫描 `reviews/` 目录，识别日报 (`YYYY-MM-DD.md`) 和周报 (`weekly/YYYY-Wxx.md`)
- **Markdown 渲染**：使用 `md-editor-v3` 完整支持表格、代码块、引用等
- **在线编辑**：管理员可编辑 Markdown 并直接提交到 GitHub
- **预渲染 (Prerender)**：构建时生成静态页面，提升 SEO 和性能
- **版本控制**：通过 GitHub SHA 检查避免并发编辑冲突

#### 核心文件
- [`app/lib/reviews.ts`](app/lib/reviews.ts) - 复盘数据解析与路由生成
- [`app/lib/generated-reviews.ts`](app/lib/generated-reviews.ts) - 构建时生成的复盘数据
- [`server/utils/review-storage.ts`](server/utils/review-storage.ts) - GitHub API 交互
- [`server/utils/review-api.ts`](server/utils/review-api.ts) - 复盘 API 中间件
- [`scripts/sync-reviews.mjs`](scripts/sync-reviews.mjs) - 构建前同步脚本

#### 关键功能
```typescript
// 解析 Markdown 表格
export function parseTables(markdown: string): Table[]

// 获取复盘记录
export function getReview(kind: "daily" | "weekly", slug: string): ReviewRecord | null

// 生成路由
export function reviewRoute(review: { kind, slug }): string
```

---

### 2. 私有交易复盘模块 (Trading)

#### 功能特点
- **交易台账管理**：支持加密和 A 股市场的逐笔交易记录
- **盈亏计算**：服务端计算毛/净盈亏、R 倍、持仓时长
- **日复盘系统**：每日交易总结、最佳交易、最大失误
- **附件管理**：每笔交易最多 10 张截图，使用 Vercel Private Blob 存储
- **统计分析**：按市场/策略/执行等级/情绪维度分析
- **Excel 导出**：支持日期范围筛选导出
- **并发保护**：乐观锁版本控制防止数据冲突

#### 数据库 Schema ([`db/schema.ts`](db/schema.ts))
```
trades (交易记录)
├── 基础信息：id, status, tradeDate, symbol, market, side
├── 交易细节：entryAt, exitAt, entryPrice, exitPrice, positionSize
├── 策略信息：strategy, timeframe, entryReason, exitReason
├── 盈亏数据：grossPnl, netPnl, pnlCny, rMultiple, holdMinutes
├── 复盘信息：executionGrade, emotion, errorNotes, didWell, nextImprovement
└── 元数据：version (乐观锁), deletedAt (软删除), timestamps

daily_reviews (日复盘)
├── reviewDate, marketPlan, dailySummary
├── bestTradeId (关联 trades), biggestMistake, tomorrowOneThing
├── 纪律检查：plannedOnly, followedStops, avoidedImpulseAdds, avoidedRevengeTrading
└── priorityFix, notes

trade_attachments (交易附件)
├── tradeId, pathname, blobUrl, fileName
├── contentType, size, width, height
└── sortOrder, isCover

trading_options (字典表)
└── kind (strategy/timeframe/emotion/error_tag), label, active, sortOrder

trading_settings (设置表)
└── key-value 存储，如 defaultUsdtCnyRate
```

#### 核心文件
- [`app/lib/trading.ts`](app/lib/trading.ts) - 交易工具函数（格式化、标签）
- [`shared/trading-calculator.ts`](shared/trading-calculator.ts) - 盈亏计算器
- [`server/utils/trading-repository.ts`](server/utils/trading-repository.ts) - 数据访问层
- [`server/utils/trading-validation.ts`](server/utils/trading-validation.ts) - 输入验证
- [`server/utils/trading-attachments.ts`](server/utils/trading-attachments.ts) - 附件管理
- [`shared/types/trading.ts`](shared/types/trading.ts) - TypeScript 类型定义

#### 盈亏计算逻辑
```typescript
// 计算毛盈亏
grossPnl = (exitPrice - entryPrice) * direction * positionSize
// 多头：方向=1, 空头：方向=-1
// positionBasis="quantity": 按数量计算
// positionBasis="notional": 按名义价值计算

// 计算净盈亏
netPnl = grossPnl - fees

// 转换为人民币
pnlCny = netPnl * fxToCny

// 计算 R 倍（风险倍数）
rMultiple = netPnl / plannedRiskAmount
```

---

### 3. 认证与会话管理

#### 功能特点
- **管理员登录**：基于密码哈希验证
- **会话超时**：30 分钟无操作自动过期
- **续期机制**：输入期间低频续期
- **安全存储**：使用 `nuxt-auth-utils` 加密会话

#### 核心文件
- [`server/utils/admin-password.ts`](server/utils/admin-password.ts) - 密码验证
- [`shared/auth-session.ts`](shared/auth-session.ts) - 会话管理
- [`app/middleware/trading-auth.ts`](app/middleware/trading-auth.ts) - 交易模块认证中间件
- [`app/composables/use-admin-session-timeout.ts`](app/composables/use-admin-session-timeout.ts) - 会话超时处理

---

### 4. 交易规则系统

#### 功能特点
- **规则解析**：从 `reviews/rules/trading-rules.md` 自动解析交易规则
- **动态生成**：构建时生成 `generated-trading-rules.ts`
- **规则展示**：在交易页面显示规则面板

#### 核心文件
- [`app/lib/trading-rules.ts`](app/lib/trading-rules.ts) - 规则解析器
- [`app/components/TradingRulesPanel.vue`](app/components/TradingRulesPanel.vue) - 规则展示组件

---

## 项目目录结构

```
stock-exchange-reviews/
├── app/                          # Nuxt 应用核心
│   ├── components/               # Vue 组件
│   │   ├── Dashboard.vue         # 首页驾驶舱
│   │   ├── TradingShell.vue      # 交易模块布局
│   │   ├── TradeFormModal.vue    # 交易表单
│   │   ├── MarkdownDocument.vue  # Markdown 渲染
│   │   └── ...
│   ├── composables/              # 组合式函数
│   │   ├── use-admin-session-timeout.ts
│   │   └── use-theme.ts
│   ├── lib/                      # 工具库
│   │   ├── reviews.ts            # 复盘数据解析
│   │   ├── trading.ts            # 交易工具
│   │   ├── trading-rules.ts      # 交易规则解析
│   │   ├── markdown.ts           # Markdown 处理
│   │   └── markdown-sanitize.ts  # XSS 防护
│   ├── pages/                    # 页面路由
│   │   ├── index.vue             # 首页
│   │   ├── report/[kind]/[slug].vue  # 复盘详情页
│   │   └── trading/              # 交易模块
│   │       ├── index.vue         # 交易总览
│   │       ├── trades.vue        # 交易台账
│   │       ├── daily/[date].vue  # 日复盘
│   │       ├── analytics.vue     # 统计分析
│   │       └── settings.vue      # 设置与导出
│   └── plugins/                  # 插件
│
├── server/                       # 服务端代码
│   ├── api/                      # API 路由
│   │   ├── auth/                 # 认证接口
│   │   ├── reviews/              # 复盘接口
│   │   └── trading/              # 交易接口
│   └── utils/                    # 服务端工具
│       ├── review-api.ts         # 复盘 API 中间件
│       ├── review-storage.ts     # GitHub 存储
│       ├── trading-db.ts         # 数据库连接
│       ├── trading-repository.ts # 数据访问层
│       ├── trading-validation.ts # 输入验证
│       └── trading-attachments.ts # 附件管理
│
├── db/                           # 数据库
│   └── schema.ts                 # Drizzle Schema
│
├── shared/                       # 共享代码
│   ├── types/
│   │   └── trading.ts            # 交易类型定义
│   └── trading-calculator.ts     # 盈亏计算器
│
├── reviews/                      # 复盘资料（Git 存储）
│   ├── YYYY-MM-DD.md             # 日报
│   ├── weekly/YYYY-Wxx.md        # 周报
│   └── rules/trading-rules.md    # 交易规则
│
├── scripts/                      # 构建脚本
│   ├── sync-reviews.mjs          # 同步复盘文件
│   ├── import-trading-workbook.mjs # Excel 迁移
│   └── hash-admin-password.ts    # 密码哈希
│
├── .env.example                  # 环境变量示例
├── nuxt.config.ts                # Nuxt 配置
├── package.json                  # 依赖定义
└── drizzle.config.ts             # Drizzle 配置
```

---

## 关键 API 路由

### 认证 API
- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/refresh` - 刷新会话
- `POST /api/auth/logout` - 退出登录

### 复盘 API
- `GET /api/reviews/[kind]/[slug]` - 获取复盘内容
- `PUT /api/reviews/[kind]/[slug]` - 保存复盘内容（需登录）

### 交易 API
- `GET /api/trading/dashboard` - 获取仪表盘数据
- `GET /api/trading/trades` - 获取交易列表（支持筛选）
- `POST /api/trading/trades` - 创建交易
- `PATCH /api/trading/trades/[id]` - 更新交易
- `DELETE /api/trading/trades/[id]` - 删除交易（软删除）
- `POST /api/trading/trades/[id]/attachments` - 上传附件
- `GET /api/trading/daily-reviews/[date]` - 获取日复盘
- `PUT /api/trading/daily-reviews/[date]` - 更新日复盘
- `GET /api/trading/export.xlsx` - 导出 Excel
- `GET /api/trading/options` - 获取字典选项

---

## 环境配置

### 必需环境变量
```bash
# 认证
NUXT_ADMIN_PASSWORD_HASH=xxx      # 管理员密码哈希
NUXT_SESSION_PASSWORD=xxx         # 会话加密密钥 (≥32 字符)

# GitHub 集成
NUXT_GITHUB_TOKEN=xxx             # Fine-grained Personal Access Token
NUXT_GITHUB_OWNER=SmartDengC      # 仓库所有者
NUXT_GITHUB_REPO=stock-exchange-reviews  # 仓库名
NUXT_GITHUB_BRANCH=main           # 分支名

# 数据库 (私有交易)
NUXT_DATABASE_URL=xxx             # Neon Postgres 连接串

# 对象存储 (私有截图)
NUXT_BLOB_READ_WRITE_TOKEN=xxx    # Vercel Private Blob 令牌
```

---

## 技术亮点

### 1. 混合部署架构
- **预渲染 (SSG)**：公开复盘页面在构建时生成静态 HTML
- **服务端渲染 (SSR)**：交易模块实时渲染，支持动态数据
- **API 路由**：Vercel Functions 处理认证和数据操作

### 2. 数据安全性
- **会话加密**：使用 `nuxt-auth-utils` 加密存储
- **自动超时**：30 分钟无操作自动登出
- **私有资源**：截图使用 Vercel Private Blob，需要认证访问
- **XSS 防护**：Markdown 内容通过 `sanitize-html` 清洗

### 3. 并发控制
- **GitHub 版本检查**：保存时检查 SHA 防止覆盖
- **乐观锁**：数据库记录使用 `version` 字段
- **软删除**：交易记录标记删除而非物理删除

### 4. 精确计算
- **Decimal.js**：使用高精度库计算盈亏，避免浮点误差
- **服务端计算**：所有盈亏计算在服务端进行，保证数据一致性
- **逐笔汇率**：支持每笔交易独立汇率记录

### 5. 构建优化
- **自动同步**：`prebuild` 脚本自动同步复盘文件
- **按需加载**：交易规则在构建时解析生成
- **TypeScript 严格模式**：全项目启用严格类型检查

---

## 部署流程

### 本地开发
```bash
pnpm install
pnpm exec dotenv --no-expand -e .env -e .env.local -- pnpm run dev
```

### 生产构建
```bash
pnpm run build    # 自动执行 prebuild 同步复盘
pnpm run preview  # 本地预览
```

### Vercel 部署
1. 连接 GitHub 仓库
2. 配置环境变量
3. 设置框架预设：`Nuxt.js`
4. 构建命令：`npm run build`
5. Node 版本：`22.x`

---

## 扩展建议

### 功能扩展
1. **图表可视化**：添加 TradingView 图表集成
2. **绩效报告**：月度/年度绩效分析
3. **提醒系统**：交易纪律提醒
4. **数据备份**：定期导出备份到 S3

### 性能优化
1. **缓存策略**：添加 Redis 缓存热点数据
2. **分页加载**：交易列表分页优化
3. **图片优化**：截图压缩和懒加载

### 安全性增强
1. **2FA**：添加双因素认证
2. **审计日志**：记录所有数据修改操作
3. **IP 白名单**：限制管理后台访问 IP

---

## 总结

这是一个**设计精良的个人交易系统**，具有以下特点：

✅ **清晰的架构分层**：公开/私有模块分离，职责明确  
✅ **安全的数据管理**：加密会话、私有存储、并发控制  
✅ **精确的财务计算**：Decimal.js 保证计算准确性  
✅ **良好的开发者体验**：TypeScript 严格模式、自动化脚本  
✅ **现代部署方式**：Nuxt 混合渲染 + Vercel Serverless

**适用场景**：个人交易者、量化研究员、投资记录管理

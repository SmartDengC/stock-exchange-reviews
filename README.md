# 市场日记 · 股市复盘研究终端

一个公开市场研究终端，以及集成在同一 Nuxt 项目中的私有交易复盘系统。公开日报、周报继续以 `reviews/` 中的 Markdown 为数据源；逐笔交易、日复盘和截图由仅管理员可访问的 `/trading` 模块管理。

> 本项目仅用于个人研究与历史复盘，不构成投资建议。

## 功能

- 自动发现并展示日报、周报；首页默认呈现最新周报。
- 覆盖 A 股、港股、黄金、原油、板块轮动、宏观事件及下周情景。
- 使用 `md-editor-v3` 展示日报与周报，完整支持 Markdown 表格、段落、引用、列表和代码块。
- 管理员可在预览与源码编辑之间切换，并将修改直接提交回 GitHub 中的原始 Markdown。
- `/trading` 提供交易总览、台账筛选、日复盘、行为统计、字典维护和 Excel 导出。
- 支持未平仓记录、服务端盈亏/R 倍计算、逐笔汇率、并发编辑检测、软删除和每笔最多 10 张私有截图。
- 管理员会话在无操作 30 分钟后过期；输入期间低频续期，长期隐藏或无操作后自动退出。
- 深色 / 浅色主题切换；浅色主题采用暖纸张与网格背景。
- 核心驱动框架以摘要卡片呈现，并链接回完整周报原文。
- 公开资料仍由 GitHub Contents API 写入；私有交易使用 Neon Postgres 和 Vercel Private Blob。

## 目录结构

```text
.
├── reviews/                         # 原始复盘资料
│   ├── YYYY-MM-DD.md                # 日度复盘
│   └── weekly/YYYY-Wxx.md           # 周度回顾
├── app/                             # 页面、预览与编辑组件
├── db/                              # Drizzle Postgres 数据模型
├── drizzle/                         # 数据库迁移与默认字典
├── server/api/                      # 登录、GitHub 与私有交易接口
├── scripts/sync-reviews.mjs         # 将资料同步为构建时数据
├── scripts/import-trading-workbook.mjs # 一次性 Excel 迁移
└── package.json
```

只有以下命名的资料会进入归档与生成路由：

- 日报：`reviews/YYYY-MM-DD.md`
- 周报：`reviews/weekly/YYYY-Wxx.md`

`reviews/README.md` 仅作为说明文件，不会被误识别为日报。

## 本地运行

环境要求：Node.js `>= 22.13.0`，建议使用 pnpm。

```bash
pnpm install
pnpm run dev
```

若本机 npm 镜像不可用，可改用官方源安装：

```bash
pnpm install --registry=https://registry.npmjs.org/
```

启动成功后，打开终端输出的本地地址（通常为 `http://localhost:3000`）。

## 配置在线编辑

复制 `.env.example` 为本地 `.env`，并在 Vercel Project Settings → Environment Variables 中配置相同变量：

```bash
pnpm run auth:hash
```

将输出保存为 `NUXT_ADMIN_PASSWORD_HASH`。此外需要：

- `NUXT_SESSION_PASSWORD`：至少 32 个字符，用于加密管理员会话。
- `NUXT_GITHUB_TOKEN`：新建 fine-grained token，仅授权当前仓库，并将 Repository permissions → Contents 设置为 `Read and write`。只有 `admin:org` 等组织权限的 classic token 无法保存文件。
- `NUXT_GITHUB_OWNER`、`NUXT_GITHUB_REPO`、`NUXT_GITHUB_BRANCH`：默认分别为 `SmartDengC`、`stock-exchange-reviews`、`main`。

所有密钥只在服务端读取，不会发送到浏览器或提交进仓库。

## 配置私有交易复盘

在 Vercel Marketplace 中连接 Neon Postgres 和 Private Blob，并配置：

- `NUXT_DATABASE_URL`：Neon 的 pooled Postgres 连接串；也兼容 Marketplace 注入的 `DATABASE_URL` 或 `POSTGRES_URL`。
- `NUXT_BLOB_READ_WRITE_TOKEN`：Private Blob 的读写令牌；也兼容 Marketplace 注入的 `BLOB_READ_WRITE_TOKEN`。

首次上线前执行数据库迁移：

```bash
pnpm run db:migrate
```

交易页入口为 `/trading`。所有页面、API、导出的截图链接和原图读取都要求管理员会话，并返回 `private, no-store`。

### 迁移原 Excel

默认读取 `reviews_trading/币安+A股每日交易复盘模板-优化.xlsx`。先执行不会写入数据库的检查：

```bash
pnpm trading:import
```

报告确认无误后，在已配置 Neon 与 Blob 环境变量的机器上执行：

```bash
pnpm trading:import -- --apply
```

迁移使用文件 SHA-256 与源行号去重，按图片左上角所在行关联截图，并由新计算器重新生成盈亏快照。原始工作簿不会被修改。网页投入使用后，应以网页为唯一数据源；需要备份时在“设置与导出”中按日期范围导出 Excel。

## 更新资料

可以在 `reviews/` 中直接修改文件，也可以在网页中以管理员身份登录，打开任意复盘后点击“编辑 Markdown”。网页保存会：

1. 使用当前 GitHub 文件 SHA 检查版本，避免覆盖其他提交。
2. 将新内容提交到 `main` 分支。
3. 立即刷新当前预览，并等待 Vercel 自动部署后同步首页指标。

手工修改文件后，重启开发服务器或重新构建：

```bash
pnpm run build
```

启动和构建前会自动执行资料同步，无需维护额外的数据文件。

## 常用命令

```bash
pnpm run dev       # 启动本地开发服务器
pnpm run build     # 生成 Nuxt 混合生产构建
pnpm test          # 同步并验证资料索引与路由
pnpm run lint      # 运行静态检查
pnpm run auth:hash # 生成管理员密码哈希
pnpm run db:generate # 根据 Drizzle schema 生成迁移
pnpm run db:migrate  # 执行 Neon 数据库迁移
pnpm trading:import  # 对原 Excel 执行 dry-run
```

## 路由

- `/`：最新周报驾驶舱与归档入口
- `/report/weekly/YYYY-Wxx`：周报详情
- `/report/daily/YYYY-MM-DD`：日报详情
- `/trading`：私有交易总览
- `/trading/trades`：交易台账与筛选
- `/trading/daily/YYYY-MM-DD`：每日复盘
- `/trading/analytics`：统计与行为洞察
- `/trading/settings`：字典、汇率与 Excel 导出

## Vercel 部署

项目使用 Nuxt 混合部署：公开页面在构建时预渲染，登录和 Markdown 保存接口作为 Vercel Functions 运行。

| 设置项 | 值 |
| --- | --- |
| Framework Preset | `Nuxt.js` |
| Root Directory | `.` |
| Install Command | `npm install --registry=https://registry.npmjs.org/` |
| Build Command | `npm run build` |
| Output Directory | 留空，由 Nuxt / Vercel 自动识别 |
| Node.js Version | `22.x` |

Vercel 通过根目录的 `vercel.json` 强制使用 npm；本地开发与测试仍使用 pnpm。

构建前会自动把仓库根目录的 `reviews/` 同步至应用内数据模块，并预渲染全部报告页面。网页保存到 `main` 后，GitHub 集成会触发新的 Vercel 部署。

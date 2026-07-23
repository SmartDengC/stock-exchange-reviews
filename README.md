# 市场日记 · 股市复盘研究终端

一个以 Markdown 为数据源的本地市场复盘系统。将日度、周度复盘保存在 `reviews/`，即可在 Web 终端中查看跨市场表现、板块轮动、宏观事件、驱动框架与情景推演。

> 本项目仅用于个人研究与历史复盘，不构成投资建议。

## 功能

- 自动发现并展示日报、周报；首页默认呈现最新周报。
- 覆盖 A 股、港股、黄金、原油、板块轮动、宏观事件及下周情景。
- 使用 `md-editor-v3` 展示日报与周报，完整支持 Markdown 表格、段落、引用、列表和代码块。
- 管理员可在预览与源码编辑之间切换，并将修改直接提交回 GitHub 中的原始 Markdown。
- 管理员登录固定有效 5 分钟；到期自动退出，当前页面中的未保存草稿继续保留。
- 深色 / 浅色主题切换；浅色主题采用暖纸张与网格背景。
- 核心驱动框架以摘要卡片呈现，并链接回完整周报原文。
- 无数据库；资料在启动和构建前自动同步，写入由受保护的 Nitro API 和 GitHub Contents API 完成。

## 目录结构

```text
.
├── reviews/                         # 原始复盘资料
│   ├── YYYY-MM-DD.md                # 日度复盘
│   └── weekly/YYYY-Wxx.md           # 周度回顾
├── app/                             # 页面、预览与编辑组件
├── server/api/                      # 登录与 GitHub 读写接口
├── scripts/sync-reviews.mjs         # 将资料同步为构建时数据
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
```

## 路由

- `/`：最新周报驾驶舱与归档入口
- `/report/weekly/YYYY-Wxx`：周报详情
- `/report/daily/YYYY-MM-DD`：日报详情

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

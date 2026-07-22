# 市场日记 · 股市复盘研究终端

一个以 Markdown 为数据源的本地市场复盘系统。将日度、周度复盘保存在 `reviews/`，即可在 Web 终端中查看跨市场表现、板块轮动、宏观事件、驱动框架与情景推演。

> 本项目仅用于个人研究与历史复盘，不构成投资建议。

## 功能

- 自动发现并展示日报、周报；首页默认呈现最新周报。
- 覆盖 A 股、港股、黄金、原油、板块轮动、宏观事件及下周情景。
- 提供日报与周报详情页，保留原始 Markdown 表格、段落和引用。
- 深色 / 浅色主题切换；浅色主题采用暖纸张与网格背景。
- 核心驱动框架以摘要卡片呈现，并链接回完整周报原文。
- 无数据库、无登录、无手工录入后台；资料在启动和构建前自动同步。

## 目录结构

```text
.
├── reviews/                         # 原始复盘资料
│   ├── YYYY-MM-DD.md                # 日度复盘
│   └── weekly/YYYY-Wxx.md           # 周度回顾
├── app/                             # 页面与展示组件
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

## 更新资料

1. 在 `reviews/` 按约定新增或修改 Markdown 文件。
2. 重启开发服务器，或运行以下命令重新构建：

```bash
pnpm run build
```

启动和构建前会自动执行资料同步，无需维护额外的数据文件。

## 常用命令

```bash
pnpm run dev       # 启动本地开发服务器
pnpm run build     # 生成生产构建
pnpm test          # 同步并验证资料索引与路由
pnpm run lint      # 运行静态检查
```

## 路由

- `/`：最新周报驾驶舱与归档入口
- `/report/weekly/YYYY-Wxx`：周报详情
- `/report/daily/YYYY-MM-DD`：日报详情

## 静态部署

项目使用 Nuxt 静态生成，执行 `pnpm run build` 后部署 `.output/public/` 即可。

| 设置项 | 值 |
| --- | --- |
| Framework Preset | `Nuxt.js` |
| Root Directory | `.` |
| Install Command | `pnpm install` |
| Build Command | `pnpm run build` |
| Output Directory | `.output/public` |
| Node.js Version | `22.x` |

构建前会自动把仓库根目录的 `reviews/` 同步至应用内数据模块，并预渲染全部报告页面。

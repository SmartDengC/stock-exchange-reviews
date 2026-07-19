# 市场日记 · Web 研究终端

这是一个本地运行的市场复盘终端。它在构建时自动读取同级目录中的 `../reviews/`：

- `../reviews/YYYY-MM-DD.md`：日度复盘
- `../reviews/weekly/YYYY-Wxx.md`：周度回顾

## 本地运行

```bash
cd market-diary-web
npm run dev
```

打开终端提示的本地地址即可查看。新增或修改 Markdown 后，重新运行 `npm run build`（或在开发服务器运行时等待刷新）便会更新页面内容。

## 常用命令

```bash
npm run build  # 构建生产版本
npm test       # 构建并验证资料索引与页面内容
```

页面默认展示最新周报，并提供周报、日报的可分享路由；不需要数据库、登录或人工录入。

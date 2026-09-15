# 问题记录

本文记录项目安装依赖和验证过程中遇到的问题、排查证据及解决方式。

## 1. pnpm 启动失败：`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`

### 现象

在项目根目录执行 `pnpm i` 时，命令在安装依赖前立即失败：

```text
TypeError [ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING]: A dynamic import callback was not specified.
    at importModuleDynamicallyCallback (node:internal/modules/esm/utils:273:9)
    ...
    at /usr/local/lib/node_modules/corepack/dist/lib/corepack.cjs
```

### 项目要求

- Node.js：`22.18.x`，版本文件为 `.node-version` 中的 `22.18.0`
- pnpm：`11.16.x`
- `package.json` 固定 `packageManager` 为 `pnpm@11.16.0`

### 排查过程

1. 当前 shell 使用的是 Node.js `22.22.0`，与项目指定的 `22.18.x` 不一致。
2. `pnpm` 解析到 `/usr/local/bin/pnpm`，实际由旧版 Corepack `0.23.0` 提供。
3. 项目缓存中的 pnpm `11.16.0` 使用 `bin/pnpm.cjs` 兼容垫片，并通过动态 `import('./pnpm.mjs')` 启动。
4. 直接执行 `pnpm.mjs` 可以正常返回 `11.16.0`，说明 pnpm 包本身没有损坏；失败发生在旧 Corepack 加载 pnpm 的阶段。

### 根因

pnpm 11 使用 ESM 入口，而旧版 Corepack 的 VM 加载方式没有提供所需的动态 import 回调，因此旧代理无法启动 pnpm 11。Corepack 后续版本增加了 pnpm 11 入口路径兼容处理，见 [Corepack 更新记录](https://github.com/nodejs/corepack/blob/main/CHANGELOG.md)。

### 解决方式

先切换到项目指定的 Node.js，再在该 Node.js 环境中安装并启用新版 Corepack 和固定版本 pnpm：

```bash
source ~/.nvm/nvm.sh
nvm install 22.18.0
nvm use 22.18.0

# Corepack 0.36.0 要求 Node.js 22.22.2+，与项目的 22.18.x 不匹配。
# 因此固定使用已支持 pnpm 11 入口的 0.35.0。
npm install --global corepack@0.35.0
corepack enable pnpm
corepack install --global pnpm@11.16.0
hash -r
```

验证命令：

```bash
node --version
corepack --version
pnpm --version
command -v node
command -v pnpm
```

修复后的结果：

```text
v22.18.0
0.35.0
11.16.0
~/.nvm/versions/node/v22.18.0/bin/node
~/.nvm/versions/node/v22.18.0/bin/pnpm
```

然后执行：

```bash
pnpm install
```

依赖安装成功，39 个 workspace 项目完成安装和 postinstall 构建；再次执行离线安装复核也成功，未再出现动态 import 错误。

> `nvm use` 只影响执行它的 shell 进程。若新终端仍解析到 `/usr/local/bin/pnpm`，需要重新执行 `source ~/.nvm/nvm.sh`、`nvm use 22.18.0` 和 `hash -r`。

## 2. Corepack 版本与 Node.js 引擎约束提示

安装 `corepack@latest` 得到 `0.36.0` 时，npm 提示该版本要求 Node.js `^22.22.2`；安装 `0.35.0` 时也会显示相同的 npm 引擎提示。由于项目明确固定 Node.js `22.18.x`，最终保留 Corepack `0.35.0`：它可以在当前 Node.js 上正常执行并解决 pnpm 11 启动问题，但 npm 仍会显示引擎警告。

如果未来要消除该警告，应先由项目统一升级 Node.js 约束，再升级 Corepack；本次不修改项目版本约束。

## 3. 安装后的测试失败

`pnpm test` 能够正常启动，说明 pnpm 工具链已恢复；结果为 `122` 个测试通过、2 个测试失败：

- `tests/memory-routes.spec.ts`：期望菜单名称 `固定 Memo 总览`，实际得到 `Memo 总览`。
- `tests/review-archive.spec.ts`：编辑保存场景在 5 秒测试超时。

这两个失败不发生在 pnpm/Corepack 启动阶段，也不是本次工具链修复引入的修改，需单独排查。

## 4. 生产构建阶段的 `sass-embedded` EPIPE

执行 `pnpm run build` 时，Vite 在 Sass 编译阶段报错：

```text
Error: write EPIPE
    at .../sass-embedded/.../AsyncCompiler.writeStdin
```

该错误发生在依赖安装成功之后的 Sass 子进程通信阶段，与最初的 Corepack 动态 import 错误不同，需作为独立的构建问题排查。


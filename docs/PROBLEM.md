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

## 4. `sass-embedded` 导致 Vite 开发服务和生产构建 EPIPE

### 现象

执行 `pnpm run dev` 或 `pnpm run build` 时，Vite 在首次 Sass 编译阶段退出：

```text
Error: write EPIPE
    at .../sass-embedded/.../AsyncCompiler.writeStdin
```

### 排查过程

1. 机器是 Intel `x86_64`，安装的也是 `sass-embedded-darwin-x64`，排除了 CPU 架构不匹配。
2. 直接运行 `sass-embedded@1.99.0` 内置的 Sass 可执行文件，得到真正的底层错误：

   ```text
   VM initialization failed: Current Mac OS X version 12.0 is lower than minimum supported version 14.0
   ```

3. Vite 只看到 Sass 子进程提前关闭，继续向已关闭的 stdin 管道写入时才报 `EPIPE`，因此 `EPIPE` 是次级症状。
4. 通过在临时目录分别运行官方二进制确认版本边界：
   - `sass-embedded@1.98.0`：失败，要求 macOS 14。
   - `sass-embedded@1.97.3`：成功，支持当前 macOS 12。

### 根因

`sass-embedded@1.98.0` 及以上版本携带的 Dart Sass 运行时不再支持 macOS 12。项目 catalog 使用 `^1.99.0`，因此依赖安装到了无法在当前系统上启动的 `1.99.0`。

### 解决方式

在 `pnpm-workspace.yaml` 中将 `sass-embedded` 精确固定为 `1.97.3`，并通过已有的 `overrides` 机制要求所有 workspace 和 Vite peer 依赖使用同一版本：

```yaml
overrides:
  sass-embedded: 'catalog:'

catalog:
  sass-embedded: 1.97.3
```

然后更新锁文件：

```bash
pnpm install
```

验证结果：

- Vite 实际解析到 `sass-embedded@1.97.3`。
- `pnpm run build` 成功，7203 个模块完成转换。
- `pnpm run dev` 完成 dependency optimizer，首页返回 `200 OK`，不再出现 `EPIPE`。

长期也可以通过将 macOS 升级到 14 或将工程改为使用纯 JavaScript `sass` 实现来解除版本固定；本次采用了改动最小的依赖回退方案。

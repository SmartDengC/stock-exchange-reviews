# DSH × TradingView MCP 使用指南

> 通过 DeepSeek Harness (DSH) 集成 tradingview-mcp，让 AI 助手能够操作你的 TradingView 图表

---

## 📋 目录

1. [概述](#概述)
2. [前置条件](#前置条件)
3. [安装步骤](#安装步骤)
4. [配置 DSH](#配置-dsh)
5. [启动流程](#启动流程)
6. [验证连接](#验证连接)
7. [工具使用](#工具使用)
8. [使用场景示例](#使用场景示例)
9. [常见问题](#常见问题)
10. [故障排查](#故障排查)

---

## 概述

本指南介绍如何在 **DeepSeek Harness (DSH)** 中集成 **[tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp)**，使 AI 助手能够通过 MCP 工具与你的 TradingView Desktop 应用交互。

### 功能概览

集成后，DSH 的 AI 助手可以：

- ✅ 读取图表数据（标的、时间周期、价格、指标值）
- ✅ 修改图表配置（切换标的、调整时间周期）
- ✅ 添加/删除指标（RSI、MACD、移动平均线等）
- ✅ 绘制图表元素（水平线、趋势线、矩形、文本）
- ✅ 管理价格警报（创建、查看、删除）
- ✅ 编写和调试 Pine Script
- ✅ 截图供 AI 视觉分析
- ✅ 回测演练（bar replay）

### 工作原理

```
DSH (AI Agent)
    ↓ MCP 协议 (stdio)
tradingview-mcp (Node.js)
    ↓ Chrome DevTools Protocol (CDP)
TradingView Desktop (--remote-debugging-port=9222)
```

---

## 前置条件

### 必需软件

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| TradingView Desktop | 最新版 | **需要付费订阅**才能使用实时数据 |
| Node.js | 18+ | 运行 tradingview-mcp |
| DSH | 最新版 | DeepSeek Harness |

### 系统要求

- **macOS** / **Windows** / **Linux**
- 足够的磁盘空间（~500MB）
- 网络连接（首次安装依赖）

---

## 安装步骤

### 步骤 1：克隆 tradingview-mcp 仓库

```bash
git clone https://github.com/tradesdontlie/tradingview-mcp.git ~/tradingview-mcp
cd ~/tradingview-mcp
```

### 步骤 2：安装依赖

```bash
npm install
```

### 步骤 3：验证安装

```bash
ls src/server.js
# 应显示：src/server.js
```

---

## 配置 DSH

DSH 通过 `@deepseek-ai/dsh-mcp-client` 插件连接 MCP 服务器。有两种配置方式：

### 方式 A：临时配置（推荐先测试）

使用 `--patch` 参数启动 DSH：

```bash
dsh web --patch /path/to/tradingview-mcp-config.yml
```

配置文件内容：

```yaml
# tradingview-mcp-config.yml
- insert:
    - id: mcp-tradingview
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: stdio
        serverName: tradingview
        command: node
        args: ['/Users/yourname/tradingview-mcp/src/server.js']
        cwd: /Users/yourname/tradingview-mcp
        toolCallTimeoutMs: 60000
        failOnStartupError: false
```

### 方式 B：永久配置（推荐）

编辑你的 DSH 配置文件：

```bash
# 仅对 web profile 生效
nano ~/.dsh/profiles/web/cordis.patch.yml

# 或全局生效（所有 profile）
nano ~/.dsh/cordis.patch.yml
```

添加以下内容：

```yaml
# TradingView MCP 集成
- insert:
    - id: mcp-tradingview
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: stdio
        serverName: tradingview
        command: node
        args: ['/Users/yourname/tradingview-mcp/src/server.js']
        cwd: /Users/yourname/tradingview-mcp
        toolCallTimeoutMs: 60000
        failOnStartupError: false
```

> ⚠️ 注意：将 `/Users/yourname/` 替换为你的实际路径

---

## 启动流程

```bash
# 启动 TradingView 带 CDP
/Applications/TradingView.app/Contents/MacOS/TradingView --remote-debugging-port=9222

# 使用 patch 启动 DSH
pnpm dsh web --patch /tmp/tradingview-mcp.patch.yml
```

### 步骤 1：启动 TradingView Desktop（带 CDP）

**方式 1：使用项目脚本（推荐）**

```bash
cd ~/tradingview-mcp

# macOS
./scripts/launch_tv_debug_mac.sh

# Windows
scripts\launch_tv_debug.bat

# Linux
./scripts/launch_tv_debug_linux.sh
```

**方式 2：手动启动**

```bash
# macOS
/Applications/TradingView.app/Contents/MacOS/TradingView --remote-debugging-port=9222

# Windows (MSIX 版)
# 使用 tv_launch 工具自动处理，或手动复制后启动
$pkg = (Get-AppxPackage TradingView.Desktop).InstallLocation
Copy-Item "$pkg\*" "$env:LOCALAPPDATA\tradingview-mcp\TradingView" -Recurse -Force
& "$env:LOCALAPPDATA\tradingview-mcp\TradingView\TradingView.exe" --remote-debugging-port=9222

# Linux
/opt/TradingView/tradingview --remote-debugging-port=9222
```

**方式 3：通过 AI 自动启动**

启动 DSH 后，在会话中询问：

> "帮我启动 TradingView 并检查连接"

AI 会自动调用 `mcp__tradingview__tv_launch` 工具。

### 步骤 2：启动 DSH

**临时配置：**

```bash
dsh web --patch /path/to/tradingview-mcp-config.yml
```

**永久配置：**

```bash
dsh web
```

---

## 验证连接

### 方式 1：通过 AI 助手

在 DSH 会话中询问：

> "调用 `mcp__tradingview__tv_health_check` 检查连接状态"

预期响应：

```json
{
  "success": true,
  "cdp_connected": true,
  "chart_symbol": "BTCUSD",
  "api_available": true
}
```

### 方式 2：查看工具列表

在 DSH 会话中询问：

> "列出所有可用的 tradingview 工具"

应返回类似：

```
可用的 tradingview 工具：
- mcp__tradingview__tv_health_check
- mcp__tradingview__tv_launch
- mcp__tradingview__tv_get_symbol
- mcp__tradingview__tv_set_symbol
- ... (共 78 个工具)
```

---

## 工具使用

### 工具命名规则

所有工具前缀为 `mcp__tradingview__`，完整工具名为：

```
mcp__tradingview__<原始工具名>
```

例如：
- `tv_get_symbol` → `mcp__tradingview__tv_get_symbol`
- `tv_pine_compile` → `mcp__tradingview__tv_pine_compile`

### 核心工具分类

#### 🔍 连接与状态

| 工具 | 用途 |
|------|------|
| `mcp__tradingview__tv_health_check` | 检查 CDP 连接状态 |
| `mcp__tradingview__tv_launch` | 自动启动 TradingView（带 CDP） |

#### 📊 图表配置

| 工具 | 用途 |
|------|------|
| `mcp__tradingview__tv_get_symbol` | 获取当前图表标的 |
| `mcp__tradingview__tv_set_symbol` | 设置图表标的（如 `BTCUSD`, `AAPL`, `ES1!`） |
| `mcp__tradingview__tv_get_timeframe` | 获取当前时间周期 |
| `mcp__tradingview__tv_set_timeframe` | 设置时间周期（如 `1`, `5`, `15`, `60`, `D`, `W`） |

#### 📈 指标管理

| 工具 | 用途 |
|------|------|
| `mcp__tradingview__tv_add_indicator` | 添加指标（RSI、MACD、Bollinger Bands 等） |
| `mcp__tradingview__tv_remove_indicator` | 删除指标 |
| `mcp__tradingview__tv_get_indicator_values` | 获取当前指标值 |

#### 📐 绘图工具

| 工具 | 用途 |
|------|------|
| `mcp__tradingview__tv_add_horizontal_line` | 添加水平线 |
| `mcp__tradingview__tv_add_vertical_line` | 添加垂直线 |
| `mcp__tradingview__tv_add_trend_line` | 添加趋势线 |
| `mcp__tradingview__tv_add_rectangle` | 添加矩形区域 |
| `mcp__tradingview__tv_add_text` | 添加文本标注 |
| `mcp__tradingview__tv_clear_drawings` | 清除所有绘图 |

#### 🔔 警报管理

| 工具 | 用途 |
|------|------|
| `mcp__tradingview__tv_create_alert` | 创建价格警报 |
| `mcp__tradingview__tv_list_alerts` | 列出所有警报 |
| `mcp__tradingview__tv_delete_alert` | 删除指定警报 |

#### 💻 Pine Script

| 工具 | 用途 |
|------|------|
| `mcp__tradingview__tv_pine_compile` | 编译 Pine Script |
| `mcp__tradingview__tv_pine_inject` | 注入 Pine Script 到图表 |
| `mcp__tradingview__tv_pine_get_errors` | 获取编译错误 |

#### 📸 截图与分析

| 工具 | 用途 |
|------|------|
| `mcp__tradingview__tv_screenshot` | 截图（支持 full/chart/strategy_tester 区域） |
| `mcp__tradingview__tv_get_ohlcv` | 获取 OHLCV 数据 |

#### 🎮 回测演练

| 工具 | 用途 |
|------|------|
| `mcp__tradingview__tv_replay_start` | 开始 bar replay |
| `mcp__tradingview__tv_replay_step` | 前进一根 K 线 |
| `mcp__tradingview__tv_replay_stop` | 停止 replay |
| `mcp__tradingview__tv_replay_trade` | 在 replay 中执行交易 |

---

## 使用场景示例

### 场景 1：分析当前图表

> "帮我分析当前图表，获取标的、时间周期和主要指标值"

AI 会调用：
```
mcp__tradingview__tv_get_symbol
mcp__tradingview__tv_get_timeframe
mcp__tradingview__tv_get_indicator_values
```

### 场景 2：切换到比特币图表并添加 RSI

> "切换到 BTCUSD 日线图，添加 RSI 指标"

AI 会调用：
```
mcp__tradingview__tv_set_symbol (symbol: "BTCUSD")
mcp__tradingview__tv_set_timeframe (timeframe: "D")
mcp__tradingview__tv_add_indicator (indicator: "Relative Strength Index")
```

### 场景 3：设置价格警报

> "为 AAPL 设置 150 美元的买入警报"

AI 会调用：
```
mcp__tradingview__tv_set_symbol (symbol: "AAPL")
mcp__tradingview__tv_create_alert (
  condition: "greater_than",
  price: 150,
  message: "AAPL 买入信号"
)
```

### 场景 4：编写 Pine Script

> "帮我写一个双均线交叉的 Pine Script 并编译"

AI 会：
1. 编写 Pine Script 代码
2. 调用 `mcp__tradingview__tv_pine_compile` 编译
3. 如有错误，调用 `mcp__tradingview__tv_pine_get_errors` 查看
4. 成功后调用 `mcp__tradingview__tv_pine_inject` 注入到图表

### 场景 5：截图分析

> "截图当前图表，帮我分析趋势"

AI 会：
1. 调用 `mcp__tradingview__tv_screenshot` 截图
2. 使用视觉分析能力解读截图
3. 给出趋势判断

---

## 常见问题

### Q1: 工具调用失败，提示 `cdp_connected: false`

**原因**：TradingView 未以 `--remote-debugging-port=9222` 启动

**解决**：
```bash
# 重启 TradingView
/Applications/TradingView.app/Contents/MacOS/TradingView --remote-debugging-port=9222
```

### Q2: Windows 上启动 TradingView 提示 "Access is denied"

**原因**：Windows 版 TradingView 是 MSIX 包，不能直接从 `WindowsApps` 启动

**解决**：
```powershell
# 使用 tv_launch 工具自动处理
# 或在 DSH 会话中询问："帮我启动 TradingView"

# 或手动复制后启动
$pkg = (Get-AppxPackage TradingView.Desktop).InstallLocation
Copy-Item "$pkg\*" "$env:LOCALAPPDATA\tradingview-mcp\TradingView" -Recurse -Force
& "$env:LOCALAPPDATA\tradingview-mcp\TradingView\TradingView.exe" --remote-debugging-port=9222
```

### Q3: Pine Script 工具不工作

**原因**：Pine Editor 面板未打开

**解决**：
```
在 DSH 会话中询问："打开 Pine Editor 面板"
# AI 会调用 mcp__tradingview__tv_ui_open_panel (panel: "pine-editor", action: "open")
```

### Q4: 工具返回过时的数据

**原因**：TradingView 仍在加载中

**解决**：等待几秒后重试

---

## 故障排查

### 诊断流程

```
1. 检查 TradingView 是否运行
   └─ ps aux | grep -i tradingview

2. 检查端口 9222 是否监听
   └─ lsof -i :9222

3. 调用 health_check
   └─ mcp__tradingview__tv_health_check

4. 检查 MCP 服务器日志
   └─ 查看 DSH 控制台输出
```

### 常见错误码

| 错误 | 含义 | 解决 |
|------|------|------|
| `ECONNREFUSED` | TradingView 未运行或端口被占用 | 重启 TradingView，确认端口 9222 |
| `cdp_connected: false` | CDP 连接失败 | 确认 TradingView 以 `--remote-debugging-port=9222` 启动 |
| `MCP tool not found` | 工具名错误 | 检查工具名前缀 `mcp__tradingview__` |
| `serverName already in use` | serverName 冲突 | 修改配置中的 `serverName` 为唯一值 |

### 日志调试

启用详细日志：

```yaml
config:
  transport: stdio
  serverName: tradingview
  command: node
  args: ['/Users/yourname/tradingview-mcp/src/server.js']
  env:
    DEBUG: 'tradingview-mcp:*'  # 启用调试日志
```

---

## 附录

### A. 完整工具列表

tradingview-mcp 提供 **78 个 MCP 工具**，完整列表见：
https://github.com/tradesdontlie/tradingview-mcp/blob/main/README.md

### B. 配置示例

**最小化配置**（仅核心功能）：

```yaml
- insert:
    - id: mcp-tradingview
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: stdio
        serverName: tradingview
        command: node
        args: ['/Users/yourname/tradingview-mcp/src/server.js']
        cwd: /Users/yourname/tradingview-mcp
```

**增强配置**（带超时和重试）：

```yaml
- insert:
    - id: mcp-tradingview
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: stdio
        serverName: tradingview
        command: node
        args: ['/Users/yourname/tradingview-mcp/src/server.js']
        cwd: /Users/yourname/tradingview-mcp
        toolCallTimeoutMs: 60000
        failOnStartupError: false
        reconnect:
          enabled: true
          initialDelayMs: 1000
          maxDelayMs: 10000
          maxAttempts: 5
```

### C. 参考资源

- **tradingview-mcp 仓库**：https://github.com/tradesdontlie/tradingview-mcp
- **DSH MCP 客户端**：https://github.com/deepseek-ai/deepseek-harness/tree/main/packages/mcp/mcp-client
- **MCP 协议规范**：https://modelcontextprotocol.io
- **Pine Script 文档**：https://www.tradingview.com/pine-script-docs/

---

## 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2024-08 | 初始版本 |

---

> ⚠️ **免责声明**：本工具与 TradingView Inc. 无任何关联、背书或合作关系。仅通过 Chrome DevTools Protocol 与本地运行的 TradingView Desktop 交互。所有数据处理均在本地完成，不会传输到外部服务器。
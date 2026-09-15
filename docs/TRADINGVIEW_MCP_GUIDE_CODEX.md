# TradingView MCP 使用教程

本文介绍如何在 Codex Desktop、Codex CLI 和 Codex IDE 扩展中使用
[TradingView MCP](https://github.com/tradesdontlie/tradingview-mcp)，读取和控制本机
TradingView Desktop 图表。

> [!WARNING]
> TradingView MCP 是非官方工具，通过 TradingView Desktop 的 Electron 调试接口工作。
> 请遵守 TradingView 服务条款以及行情数据许可要求，不要将其用于自动交易、绕过访问限制或重新分发行情数据。

## 安装 Prompt

将下面这段 prompt 发送给 Codex，即可让 Codex 在本机安装并配置 TradingView MCP：

```text
在我的本机安装并配置 TradingView MCP，使 Codex Desktop、Codex CLI 和 IDE 扩展能够连接本机的 TradingView Desktop。

请完成以下操作：

1. 检查 Git、Node.js 18+、npm 和 TradingView Desktop 是否已安装；缺少依赖时先说明，不要静默安装系统级软件。
2. 将 https://github.com/tradesdontlie/tradingview-mcp.git 克隆到 ~/tradingview-mcp。若目录已存在，不要覆盖或删除，先检查当前状态并复用。
3. 在仓库目录运行 npm install。
4. 使用绝对路径将它注册为名为 tradingview 的 Codex STDIO MCP server。优先执行：
   codex mcp add tradingview -- node "<仓库绝对路径>/src/server.js"
5. Codex 的 MCP 配置应写入 ~/.codex/config.toml，而不是 ~/.claude/.mcp.json。保留现有配置和其他 MCP server，不要覆盖整个配置文件。
6. 运行 codex mcp list，确认 tradingview 已注册。
7. 在启动或重启桌面应用、结束现有 TradingView 进程、写入 ~/.codex/config.toml，或执行其他需要额外权限的操作前，向我申请批准。
8. 使用仓库提供的当前平台启动脚本启动 TradingView Desktop，并启用本地 Chrome DevTools Protocol 端口 9222。只允许本机访问，不要将调试端口暴露到局域网或公网。
9. 如果新增的 MCP 工具必须重启 Codex 后才能加载，请明确告诉我重启 Codex。重启后使用 tradingview MCP 的 tv_health_check 工具验证连接。
10. 最后报告安装路径、MCP 注册状态、TradingView 调试端口状态和 tv_health_check 结果；如果验证失败，给出具体错误和下一步修复方法。

不要执行 npm link，除非我另外要求安装全局 tv CLI。
```

## 1. 本机配置

当前机器采用以下配置：

| 项目 | 配置 |
| --- | --- |
| MCP 安装目录 | `/Users/dengc4r/tradingview-mcp` |
| MCP 启动程序 | `/usr/local/bin/node` |
| MCP 入口 | `/Users/dengc4r/tradingview-mcp/src/server.js` |
| Codex 配置 | `/Users/dengc4r/.codex/config.toml` |
| TradingView | `/Applications/TradingView.app` |
| CDP 地址 | `127.0.0.1:9222` |

Codex 配置中的关键部分如下：

```toml
[mcp_servers.tradingview]
command = "/usr/local/bin/node"
args = ["/Users/dengc4r/tradingview-mcp/src/server.js"]
disabled_tools = ["tv_update"]
```

`tv_update` 已禁用，Codex 不会自动更新 TradingView MCP。如需更新，由用户手动完成。

## 2. 工作原理

```text
Codex
  ↕ MCP（STDIO）
TradingView MCP
  ↕ Chrome DevTools Protocol（127.0.0.1:9222）
TradingView Desktop
```

MCP 控制的是本机已经登录的 TradingView Desktop，不会绕过订阅、登录或行情权限。

## 3. 启动与连接

### 3.1 启动 TradingView

TradingView 必须带调试端口启动。启动前先完全退出已有的 TradingView 实例，然后运行：

```bash
/Users/dengc4r/tradingview-mcp/scripts/launch_tv_debug_mac.sh 9222
```

该脚本会结束已有的 TradingView 进程，因此有未保存内容时应先手动保存。

也可以直接启动：

```bash
/Applications/TradingView.app/Contents/MacOS/TradingView \
  --remote-debugging-port=9222
```

调试端口只应绑定本机地址，不要暴露到局域网或公网。

### 3.2 检查 CDP 端口

```bash
curl http://127.0.0.1:9222/json/version
```

正常情况下会返回包含 `Browser` 和 `webSocketDebuggerUrl` 的 JSON。

### 3.3 检查 Codex MCP 注册

```bash
codex mcp list
```

列表中应包含状态为 `enabled` 的 `tradingview`。

修改 MCP 配置后需要重启 Codex Desktop 或 IDE 扩展。Codex CLI 需要退出当前会话并重新进入。

### 3.4 健康检查

在 Codex 中输入：

```text
使用 tradingview MCP 的 tv_health_check 检查连接状态。
```

成功结果的关键字段如下：

```json
{
  "success": true,
  "cdp_connected": true,
  "api_available": true
}
```

## 4. 推荐使用方式

可以直接使用自然语言，不必手动填写 MCP 参数。需要可控操作时，应在提示中说明：

- 先读取当前状态，再执行修改。
- 修改或删除图表内容前先确认。
- K 线优先使用摘要模式。
- 不调用 `tv_update`。
- 遇到不明确的问题先询问。

推荐的通用提示：

```text
使用 TradingView MCP 完成下面的任务。
先调用 chart_get_state 读取当前图表状态。
不要调用 tv_update。
涉及删除、覆盖、保存或修改现有内容时，先告诉我准备执行的操作，得到确认后再执行。
遇到不明确的问题先询问我。

任务：<填写任务>
```

## 5. 常用操作

### 5.1 读取当前图表

```text
读取当前 TradingView 图表的品种、周期、图表类型和全部可见指标。
```

Codex 通常会先调用 `chart_get_state`。

### 5.2 读取实时行情

```text
读取当前品种的最新价格、开高低收和成交量。
```

对应工具：`quote_get`。

### 5.3 读取指标

```text
读取当前图表上所有可见指标的最新数值，并用中文解释。
```

对应工具：`data_get_study_values`。

### 5.4 读取 K 线

```text
读取当前图表最近 100 根 K 线，使用 summary=true，只返回趋势、区间、
波动率、成交量概况和最近 5 根 K 线。
```

对应工具：`data_get_ohlcv`。除非确实需要逐根数据，否则始终使用 `summary=true`。

### 5.5 切换品种和周期

```text
先读取当前图表状态，然后把品种切换到 NASDAQ:AAPL，周期切换到 60 分钟。
完成后重新读取状态并确认。
```

对应工具：`chart_set_symbol`、`chart_set_timeframe`。

常见周期：

| 输入 | 含义 |
| --- | --- |
| `1` | 1 分钟 |
| `5` | 5 分钟 |
| `15` | 15 分钟 |
| `60` | 1 小时 |
| `D` | 日线 |
| `W` | 周线 |
| `M` | 月线 |

### 5.6 添加指标

```text
在当前图表添加 Relative Strength Index。执行前先确认，添加后读取指标数值。
```

对应工具：`chart_manage_indicator`。指标应使用完整英文名，例如
`Relative Strength Index`，不要只写 `RSI`。

### 5.7 截图并分析

```text
截取当前图表区域，结合价格、可见指标和 K 线摘要分析趋势、支撑位和阻力位。
不要给出自动交易指令。
```

对应工具：`capture_screenshot`，常用区域为 `chart`。

### 5.8 读取自定义 Pine 指标输出

自定义 Pine 指标使用 `line.new()`、`label.new()`、`table.new()` 或 `box.new()`
绘制的数据，可以通过以下工具读取：

| 工具 | 数据 |
| --- | --- |
| `data_get_pine_lines` | 水平价格线 |
| `data_get_pine_labels` | 文本标签和价格 |
| `data_get_pine_tables` | 表格 |
| `data_get_pine_boxes` | 价格区间 |

已知指标名时必须使用 `study_filter`：

```text
读取名称为 Profiler 的可见指标表格，调用 data_get_pine_tables，
study_filter 设置为 Profiler。
```

指标必须处于可见状态，否则工具可能无法读取。

## 6. Pine Script 工作流

### 6.1 只做静态检查

```text
使用 pine_analyze 对下面的 Pine Script 做离线静态检查。
不要打开编辑器，不要修改 TradingView 中的现有脚本：

<粘贴代码>
```

### 6.2 读取编译错误

```text
读取 Pine Editor 当前的编译错误并解释原因，不要修改代码。
```

对应工具：`pine_get_errors`。

### 6.3 写入并编译

写入操作可能覆盖编辑器中的未保存内容，应先要求确认：

```text
先确认 Pine Editor 中是否有未保存内容，并向我说明准备覆盖的内容。
得到确认后，将下面的代码写入编辑器，调用 pine_smart_compile 编译。
如果失败，只读取并解释错误，不要自行保存到云端：

<粘贴代码>
```

常见流程：

1. `pine_set_source`：写入编辑器。
2. `pine_smart_compile`：编译并检查。
3. `pine_get_errors`：读取错误。
4. `pine_get_console`：读取 `log.info()` 输出。
5. `pine_save`：保存到 TradingView 云端，必须由用户明确要求。

避免随意调用 `pine_get_source`，复杂脚本可能返回大量内容。

## 7. 绘图、提醒和回放

### 绘图

```text
在当前图表的 100.50 位置绘制一条水平线，执行前先确认。
```

对应工具：`draw_shape`，支持水平线、趋势线、矩形和文字。

### 提醒

```text
列出当前价格提醒，只读取，不删除。
```

对应工具：`alert_list`。创建和删除分别使用 `alert_create`、`alert_delete`；
删除前必须确认准确目标。

### 回放

```text
在当前图表从 2026-01-05 开始回放。先说明将改变的图表状态，得到确认后再开始。
```

常用工具：

- `replay_start`
- `replay_step`
- `replay_autoplay`
- `replay_trade`
- `replay_status`
- `replay_stop`

回放交易是图表练习，不会执行真实交易。

## 8. 多窗口和多图表

```text
列出当前所有图表窗格及品种，不做修改。
```

对应工具：`pane_list`。

```text
把布局调整为四图表，并依次设置为 AAPL、MSFT、NVDA、TSLA。
执行前先向我确认。
```

对应工具：`pane_set_layout`、`pane_set_symbol`。

标签页使用 `tab_list`、`tab_new`、`tab_switch` 和 `tab_close` 管理；
关闭标签页前应先确认。

## 9. 故障排查

### MCP 不出现在 Codex 中

```bash
codex mcp list
```

确认配置存在后，重启 Codex Desktop 或 IDE 扩展。

### `cdp_connected: false`

原因通常是 TradingView 没有带 `--remote-debugging-port=9222` 启动：

1. 完全退出所有 TradingView 进程。
2. 使用调试启动脚本重新启动。
3. 运行 `curl http://127.0.0.1:9222/json/version`。
4. 再调用 `tv_health_check`。

### `ECONNREFUSED`

表示 `127.0.0.1:9222` 没有监听。不要更改为公网地址，应检查 TradingView
是否仍在运行以及是否使用了正确启动参数。

### Pine 工具失败

先在 TradingView 中打开 Pine Editor，再重试。需要时可让 Codex 调用
`ui_open_panel`，但 UI 自动化操作前建议先确认。

### 读取不到自定义指标

- 确认指标可见。
- 使用准确的 `study_filter`。
- 先调用 `chart_get_state` 获取指标名称和实体 ID。

## 10. 安全约定

1. 禁止调用 `tv_update`，更新由用户手动执行。
2. 不暴露端口 `9222` 到局域网或公网。
3. 删除提醒、绘图、标签页或其他内容前必须确认目标。
4. 覆盖 Pine Script、保存到云端或修改现有图表前必须确认。
5. 遇到品种、周期、指标、账户状态或操作目标不明确时先询问。
6. 不使用该工具执行真实交易或自动化交易决策。
7. 不重新分发、出售或长期批量采集 TradingView 行情数据。

## 11. 快速检查清单

每次开始使用前：

- [ ] TradingView 已用端口 `9222` 启动。
- [ ] `curl http://127.0.0.1:9222/json/version` 能返回 JSON。
- [ ] `codex mcp list` 显示 `tradingview` 为 enabled。
- [ ] `tv_health_check` 返回 `success=true` 和 `cdp_connected=true`。
- [ ] 修改或删除操作已获得明确确认。
- [ ] 没有调用 `tv_update`。

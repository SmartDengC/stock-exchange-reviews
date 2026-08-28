import type { TradeInput, TradeView } from "#/shared/types/trading";

import { marketLabel as sharedMarketLabel, sideLabel as sharedSideLabel, statusLabel as sharedStatusLabel } from "#/shared/labels";

/**
 * 交易日期输入格式化器（YYYY-MM-DD）
 * 使用 Asia/Shanghai 时区，en-CA locale 确保月份和日期零填充
 * 用于 API 请求和表单输入
 */
const tradingDateInputFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * 交易日期展示格式化器（2024 年 1 月 15 日）
 * 使用 Asia/Shanghai 时区，zh-CN locale 用于中文展示
 */
const tradingDateDisplayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * 紧凑交易日期展示格式化器（1 月 15 日）
 * 不包含年份，用于表格等紧凑场景
 */
const compactTradingDateDisplayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "numeric",
  day: "numeric",
});

/**
 * 交易日期时间展示格式化器（2024 年 1 月 15 日 14:30）
 * 包含小时和分钟，用于显示精确的交易时间
 */
const tradingDateTimeDisplayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * 百分比格式化器（50.0%）
 * 保留 1 位小数
 */
const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * 获取当前交易日期（上海时区）
 * @param now 当前时间，默认为 new Date()
 * @returns 格式化的日期字符串，例如 "2024-01-15"
 */
export function currentTradingDate(now = new Date()) {
  return tradingDateInputFormatter.format(now);
}

/**
 * 格式化交易日期为中文展示格式
 * @param value 日期字符串（YYYY-MM-DD）
 * @param compact 是否使用紧凑格式（不包含年份）
 * @returns 格式化的日期字符串，例如 "2024 年 1 月 15 日" 或 "1 月 15 日"
 * @returns 无效值返回 "—"
 */
export function formatTradingDate(value: null | string | undefined, compact = false) {
  if (!value) return "—";
  // 将日期字符串转换为上海时区的 Date 对象
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return (compact ? compactTradingDateDisplayFormatter : tradingDateDisplayFormatter).format(date);
}

/**
 * 格式化交易日期时间为中文展示格式
 * @param value ISO 日期时间字符串
 * @returns 格式化的日期时间字符串，例如 "2024 年 1 月 15 日 14:30"
 * @returns 无效值返回 "—"
 */
export function formatTradingDateTime(value: null | string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return tradingDateTimeDisplayFormatter.format(date);
}

/**
 * 格式化货币金额
 * @param value 金额数值
 * @param currency 货币类型，默认 "CNY"
 * @returns 格式化的货币字符串，例如 "¥1,234.56" 或 "$1,234.5678"
 * @returns 无效值返回 "—"
 * @note CNY 保留 2 位小数，其他货币保留 4 位小数
 */
export function formatMoney(value: null | number | string | undefined, currency = "CNY") {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CNY" ? 2 : 4,
  }).format(Number(value));
}

/**
 * 格式化百分比
 * @param value 百分比数值（0-1 或 0-100）
 * @returns 格式化的百分比字符串，例如 "50.0%"
 * @returns 无效值返回 "—"
 */
export function formatPercent(value: null | number | undefined) {
  if (value === null || value === undefined) return "—";
  return percentFormatter.format(value);
}

/**
 * 格式化数字（添加千分位）
 * @param value 数值
 * @param digits 小数位数，默认 2
 * @returns 格式化的数字字符串，例如 "1,234.56"
 * @returns 无效值返回 "—"
 */
export function formatNumber(value: null | number | string | undefined, digits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

/**
 * 获取市场标签
 * @param value 市场类型
 * @returns 市场的中文标签
 */
export function marketLabel(value: TradeView["market"]) {
  return sharedMarketLabel(value);
}

/**
 * 获取交易方向标签
 * @param value 交易方向（long/short）
 * @returns 方向的中文标签（做多/做空）
 */
export function sideLabel(value: TradeView["side"]) {
  return sharedSideLabel(value);
}

/**
 * 获取交易状态标签
 * @param value 交易状态
 * @returns 状态的中文标签
 */
export function statusLabel(value: TradeView["status"]) {
  return sharedStatusLabel(value);
}

/**
 * 提取友好的错误消息
 * 从 API 错误对象中提取用户友好的错误信息
 * @param error 错误对象
 * @returns 错误消息字符串
 * @returns 无法提取时返回默认消息 "操作失败，请稍后重试"
 */
export function errorMessage(error: unknown) {
  const value = error as {
    data?: { message?: string; statusMessage?: string };
    message?: string;
  };
  // 优先级：data.message > data.statusMessage > message > 默认消息
  return value?.data?.message ?? value?.data?.statusMessage ?? value?.message ?? "操作失败，请稍后重试";
}

/**
 * 将 ISO 时间字符串转换为本地时间字符串
 * 用于表单输入，将 UTC 时间转换为用户本地时间
 * @param iso ISO 时间字符串
 * @returns 本地时间字符串（YYYY-MM-DDTHH:mm），例如 "2024-01-15T14:30"
 * @returns 无效值返回空字符串
 */
export function localDateTime(iso?: null | string) {
  if (!iso) return "";
  const date = new Date(iso);
  // 补偿时区偏移，转换为本地时间
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);  // 截取到分钟
}

/**
 * 将本地时间字符串转换为 ISO 时间字符串
 * 用于 API 提交，将本地时间转换为 UTC 时间
 * @param local 本地时间字符串
 * @returns ISO 时间字符串
 * @returns 无效值返回 null
 */
export function isoDateTime(local?: null | string) {
  return local ? new Date(local).toISOString() : null;
}

/**
 * 创建空白交易对象（用于新建交易表单）
 * 初始化所有字段为默认值，时间字段设置为当前时间
 * @param defaultRate 默认汇率，默认 "7.2"
 * @returns 初始化的 TradeInput 对象
 */
export function blankTrade(defaultRate = "7.2"): TradeInput {
  const now = new Date();
  return {
    status: "closed",  // 默认状态为已平仓
    tradeDate: currentTradingDate(now),  // 交易日期为今天
    instrumentCode: "",  // 交易品种代码
    symbol: "",  // 交易品种名称
    market: "crypto",  // 市场类型
    side: "long",  // 交易方向
    strategy: "趋势突破",  // 交易策略
    timeframe: "5 分",  // 交易周期
    entryAt: now.toISOString(),  // 入场时间
    exitAt: now.toISOString(),  // 出场时间
    entryReason: "",  // 入场理由
    exitReason: "",  // 出场理由
    entryPrice: "",  // 入场价格
    exitPrice: "",  // 出场价格
    positionSize: "",  // 持仓规模
    positionBasis: "notional",  // 持仓基准（名义金额）
    settlementCurrency: "USDT",  // 结算货币
    plannedRiskAmount: "",  // 计划风险金额
    fees: "0",  // 手续费
    fxToCny: defaultRate,  // 汇率
    executionGrade: null,  // 执行评级
    emotion: null,  // 情绪状态
    errorTags: [],  // 错误标签
    errorNotes: "",  // 错误备注
    didWell: "",  // 做得好的地方
    nextImprovement: "",  // 下次改进
  };
}

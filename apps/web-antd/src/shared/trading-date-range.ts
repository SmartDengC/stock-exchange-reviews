/**
 * 交易日期格式化器
 * 使用 Asia/Shanghai 时区，格式为 YYYY-MM-DD（en-CA  locale 确保零填充）
 */
const tradingDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * 解析交易日期（上海时区）的年月日部分
 * 使用 Intl.DateTimeFormat 确保时区准确性，避免本地时区偏差
 * @param now 待解析的 Date 对象
 * @returns 包含 year、month、day 的对象
 */
function tradingDateParts(now: Date) {
  const parts = Object.fromEntries(
    tradingDateFormatter.formatToParts(now)
      .filter((part) => part.type !== "literal")  // 过滤掉字面量部分（如分隔符）
      .map((part) => [part.type, Number(part.value)]),  // 转换为数字
  );
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
  };
}

/**
 * 将 Date 对象格式化为 UTC 日期字符串（YYYY-MM-DD）
 * 用于 API 请求的日期参数，确保日期格式统一
 * @param value Date 对象
 * @returns 格式化的日期字符串，例如 "2024-01-15"
 */
function utcDate(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),  // 月份从 0 开始，需 +1
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * 获取默认交易日期范围（最近 7 天，包含今天）
 * 用于交易列表和复盘数据的默认查询范围
 * 
 * 计算逻辑：
 * 1. 解析当前时间在上海时区的年月日
 * 2. end = 当天 00:00:00 UTC
 * 3. start = end - 7 天
 * 
 * @param now 当前时间，默认为 new Date()
 * @returns 包含 from 和 to 的日期范围对象
 * 
 * @example
 * // 假设今天是 2024-01-15
 * // 返回 { from: "2024-01-08", to: "2024-01-15" }
 */
export function getDefaultTradingDateRange(now = new Date()) {
  const { year, month, day } = tradingDateParts(now);
  
  // 结束日期：当天 00:00:00 UTC
  const end = new Date(Date.UTC(year, month - 1, day));
  
  // 开始日期：往前推 7 天
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  
  return {
    from: utcDate(start),
    to: utcDate(end),
  };
}

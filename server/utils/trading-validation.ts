import type {
  DailyReviewInput,
  ExecutionGrade,
  PositionBasis,
  SettlementCurrency,
  TradeInput,
  TradeMarket,
  TradeSide,
  TradeStatus,
} from "../../shared/types/trading";

const markets = new Set<TradeMarket>(["crypto", "a_share"]);
const sides = new Set<TradeSide>(["long", "short"]);
const statuses = new Set<TradeStatus>(["open", "closed"]);
const bases = new Set<PositionBasis>(["quantity", "notional"]);
const currencies = new Set<SettlementCurrency>(["CNY", "USDT", "USD"]);
const grades = new Set<ExecutionGrade>(["A", "B", "C"]);

export class TradingValidationError extends Error {}

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TradingValidationError("请求内容不合法");
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, max = 2_000) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TradingValidationError(`${label}不能为空`);
  }
  const result = value.trim();
  if (result.length > max) throw new TradingValidationError(`${label}内容过长`);
  return result;
}

function optionalString(value: unknown, label: string, max = 10_000) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new TradingValidationError(`${label}不合法`);
  const result = value.trim();
  if (result.length > max) throw new TradingValidationError(`${label}内容过长`);
  return result || null;
}

function enumValue<T extends string>(value: unknown, values: Set<T>, label: string) {
  if (typeof value !== "string" || !values.has(value as T)) {
    throw new TradingValidationError(`${label}不合法`);
  }
  return value as T;
}

function decimalString(value: unknown, label: string, options: { optional?: boolean; allowZero?: boolean } = {}) {
  if ((value === null || value === undefined || value === "") && options.optional) return null;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new TradingValidationError(`${label}不合法`);
  }
  const text = String(value).trim();
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(text)) throw new TradingValidationError(`${label}不合法`);
  const number = Number(text);
  if (!Number.isFinite(number)) throw new TradingValidationError(`${label}不合法`);
  if (options.allowZero ? number < 0 : number <= 0) {
    throw new TradingValidationError(`${label}必须${options.allowZero ? "大于等于" : "大于"} 0`);
  }
  return text;
}

function isoDate(value: unknown, label: string) {
  const date = requiredString(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00+08:00`))) {
    throw new TradingValidationError(`${label}不合法`);
  }
  return date;
}

function isoDateTime(value: unknown, label: string, optional = false) {
  if ((value === null || value === undefined || value === "") && optional) return null;
  const result = requiredString(value, label, 80);
  if (!Number.isFinite(Date.parse(result))) throw new TradingValidationError(`${label}不合法`);
  return new Date(result).toISOString();
}

function optionalBoolean(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "boolean") throw new TradingValidationError(`${label}不合法`);
  return value;
}

export function validateTradeInput(value: unknown): TradeInput {
  const body = object(value);
  const status = enumValue(body.status, statuses, "交易状态");
  const market = enumValue(body.market, markets, "市场");
  const settlementCurrency = enumValue(body.settlementCurrency, currencies, "结算币种");
  const entryAt = isoDateTime(body.entryAt, "开仓时间")!;
  const exitAt = isoDateTime(body.exitAt, "平仓时间", true);
  const exitPrice = decimalString(body.exitPrice, "平仓价", { optional: true });
  const exitReason = optionalString(body.exitReason, "出场理由");

  if (status === "closed" && (!exitAt || !exitPrice || !exitReason)) {
    throw new TradingValidationError("已平仓交易必须填写平仓时间、平仓价和出场理由");
  }
  if (exitAt && Date.parse(exitAt) < Date.parse(entryAt)) {
    throw new TradingValidationError("平仓时间不能早于开仓时间");
  }

  const errorTags = Array.isArray(body.errorTags)
    ? [...new Set(body.errorTags.map((item) => requiredString(item, "错误标签", 120)))].slice(0, 10)
    : [];
  const executionGrade = body.executionGrade === null || body.executionGrade === undefined || body.executionGrade === ""
    ? null
    : enumValue(body.executionGrade, grades, "执行评分");

  return {
    status,
    tradeDate: isoDate(body.tradeDate, "交易日期"),
    instrumentCode: optionalString(body.instrumentCode, "合约/证券代码", 80),
    symbol: requiredString(body.symbol, "标的", 160),
    market,
    side: enumValue(body.side, sides, "方向"),
    strategy: requiredString(body.strategy, "策略", 120),
    timeframe: requiredString(body.timeframe, "周期", 40),
    entryAt,
    exitAt: status === "closed" ? exitAt : null,
    entryReason: requiredString(body.entryReason, "入场理由", 10_000),
    exitReason: status === "closed" ? exitReason : null,
    entryPrice: decimalString(body.entryPrice, "开仓价")!,
    exitPrice: status === "closed" ? exitPrice : null,
    positionSize: decimalString(body.positionSize, "仓位/名义金额")!,
    positionBasis: enumValue(body.positionBasis, bases, "仓位口径"),
    settlementCurrency,
    plannedRiskAmount: decimalString(body.plannedRiskAmount, "计划风险金额", { optional: true }),
    fees: decimalString(body.fees ?? "0", "手续费", { allowZero: true }),
    fxToCny: settlementCurrency === "CNY" ? "1" : decimalString(body.fxToCny, "人民币汇率")!,
    executionGrade,
    emotion: optionalString(body.emotion, "情绪", 80),
    errorTags,
    errorNotes: optionalString(body.errorNotes, "错误复盘"),
    didWell: optionalString(body.didWell, "做对了什么"),
    nextImprovement: optionalString(body.nextImprovement, "下次改进"),
    updatedAt: optionalString(body.updatedAt, "版本时间", 80) ?? undefined,
  };
}

export function validateDailyReviewInput(value: unknown, routeDate?: string): DailyReviewInput {
  const body = object(value);
  const reviewDate = isoDate(routeDate ?? body.reviewDate, "复盘日期");
  return {
    reviewDate,
    marketPlan: optionalString(body.marketPlan, "市场环境/盘前计划"),
    dailySummary: optionalString(body.dailySummary, "每日总结"),
    bestTradeId: optionalString(body.bestTradeId, "最满意交易", 80),
    biggestMistake: optionalString(body.biggestMistake, "最大失误"),
    tomorrowOneThing: optionalString(body.tomorrowOneThing, "明日只改一件事"),
    plannedOnly: optionalBoolean(body.plannedOnly, "计划内交易"),
    followedStops: optionalBoolean(body.followedStops, "严格止损"),
    avoidedImpulseAdds: optionalBoolean(body.avoidedImpulseAdds, "冲动加仓"),
    avoidedRevengeTrading: optionalBoolean(body.avoidedRevengeTrading, "报复性交易"),
    exitedAsPlanned: optionalBoolean(body.exitedAsPlanned, "按计划离场"),
    priorityFix: optionalString(body.priorityFix, "优先修正项"),
    notes: optionalString(body.notes, "备注"),
    updatedAt: optionalString(body.updatedAt, "版本时间", 80) ?? undefined,
  };
}

export function throwTradingError(error: unknown): never {
  if (error instanceof TradingValidationError) {
    throw createError({ statusCode: 400, message: error.message });
  }
  throw error;
}

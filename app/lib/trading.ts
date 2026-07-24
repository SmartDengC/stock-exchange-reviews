import type { TradeInput, TradeView } from "~~/shared/types/trading";

export function formatMoney(value: string | number | null | undefined, currency = "CNY") {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CNY" ? 2 : 4,
  }).format(Number(value));
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(value: string | number | null | undefined, digits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

export function marketLabel(value: TradeView["market"]) {
  return value === "crypto" ? "加密" : "A股";
}

export function sideLabel(value: TradeView["side"]) {
  return value === "long" ? "做多" : "做空";
}

export function statusLabel(value: TradeView["status"]) {
  return value === "closed" ? "已平仓" : "未平仓";
}

export function errorMessage(error: unknown) {
  const value = error as {
    data?: { message?: string; statusMessage?: string };
    message?: string;
  };
  return value?.data?.message ?? value?.data?.statusMessage ?? value?.message ?? "操作失败，请稍后重试";
}

export function localDateTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function isoDateTime(local?: string | null) {
  return local ? new Date(local).toISOString() : null;
}

export function blankTrade(defaultRate = "7.2"): TradeInput {
  const now = new Date();
  return {
    status: "closed",
    tradeDate: now.toISOString().slice(0, 10),
    instrumentCode: "",
    symbol: "",
    market: "crypto",
    side: "long",
    strategy: "趋势突破",
    timeframe: "5分",
    entryAt: now.toISOString(),
    exitAt: now.toISOString(),
    entryReason: "",
    exitReason: "",
    entryPrice: "",
    exitPrice: "",
    positionSize: "",
    positionBasis: "notional",
    settlementCurrency: "USDT",
    plannedRiskAmount: "",
    fees: "0",
    fxToCny: defaultRate,
    executionGrade: null,
    emotion: null,
    errorTags: [],
    errorNotes: "",
    didWell: "",
    nextImprovement: "",
  };
}

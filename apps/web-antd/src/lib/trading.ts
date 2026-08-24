import type { TradeInput, TradeView } from "#/shared/types/trading";

import { marketLabel as sharedMarketLabel, sideLabel as sharedSideLabel, statusLabel as sharedStatusLabel } from "#/shared/labels";

const tradingDateInputFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const tradingDateDisplayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const compactTradingDateDisplayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "numeric",
  day: "numeric",
});

const tradingDateTimeDisplayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function currentTradingDate(now = new Date()) {
  return tradingDateInputFormatter.format(now);
}

export function formatTradingDate(value: null | string | undefined, compact = false) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return (compact ? compactTradingDateDisplayFormatter : tradingDateDisplayFormatter).format(date);
}

export function formatTradingDateTime(value: null | string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return tradingDateTimeDisplayFormatter.format(date);
}

export function formatMoney(value: null | number | string | undefined, currency = "CNY") {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CNY" ? 2 : 4,
  }).format(Number(value));
}

export function formatPercent(value: null | number | undefined) {
  if (value === null || value === undefined) return "—";
  return percentFormatter.format(value);
}

export function formatNumber(value: null | number | string | undefined, digits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

export function marketLabel(value: TradeView["market"]) {
  return sharedMarketLabel(value);
}

export function sideLabel(value: TradeView["side"]) {
  return sharedSideLabel(value);
}

export function statusLabel(value: TradeView["status"]) {
  return sharedStatusLabel(value);
}

export function errorMessage(error: unknown) {
  const value = error as {
    data?: { message?: string; statusMessage?: string };
    message?: string;
  };
  return value?.data?.message ?? value?.data?.statusMessage ?? value?.message ?? "操作失败，请稍后重试";
}

export function localDateTime(iso?: null | string) {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function isoDateTime(local?: null | string) {
  return local ? new Date(local).toISOString() : null;
}

export function blankTrade(defaultRate = "7.2"): TradeInput {
  const now = new Date();
  return {
    status: "closed",
    tradeDate: currentTradingDate(now),
    instrumentCode: "",
    symbol: "",
    market: "crypto",
    side: "long",
    strategy: "趋势突破",
    timeframe: "5 分",
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

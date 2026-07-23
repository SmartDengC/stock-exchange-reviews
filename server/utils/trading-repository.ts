import type { H3Event } from "h3";
import Decimal from "decimal.js";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import {
  dailyReviews,
  tradeAttachments,
  tradeErrorTags,
  trades,
  tradingOptions,
  tradingSettings,
} from "../../db/schema";
import { calculateTrade } from "../../shared/trading-calculator";
import type {
  DailyReviewInput,
  DailyReviewView,
  DashboardBreakdown,
  DashboardMetrics,
  TradeAttachment,
  TradeInput,
  TradeView,
  TradingDashboard,
  TradingOption,
  TradingOptionsResponse,
} from "../../shared/types/trading";
import { getTradingDb } from "./trading-db";

type TradeRow = typeof trades.$inferSelect;

function iso(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function decimal(value: string | null | undefined) {
  return value === null || value === undefined ? null : String(value);
}

function baseTrade(row: TradeRow): Omit<TradeView, "attachments" | "errorTags"> {
  return {
    id: row.id,
    status: row.status as TradeView["status"],
    tradeDate: row.tradeDate,
    instrumentCode: row.instrumentCode,
    symbol: row.symbol,
    market: row.market as TradeView["market"],
    side: row.side as TradeView["side"],
    strategy: row.strategy,
    timeframe: row.timeframe,
    entryAt: iso(row.entryAt)!,
    exitAt: iso(row.exitAt),
    entryReason: row.entryReason,
    exitReason: row.exitReason,
    entryPrice: String(row.entryPrice),
    exitPrice: decimal(row.exitPrice),
    positionSize: String(row.positionSize),
    positionBasis: row.positionBasis as TradeView["positionBasis"],
    settlementCurrency: row.settlementCurrency as TradeView["settlementCurrency"],
    plannedRiskAmount: decimal(row.plannedRiskAmount),
    fees: String(row.fees),
    fxToCny: String(row.fxToCny),
    executionGrade: row.executionGrade as TradeView["executionGrade"],
    emotion: row.emotion,
    errorNotes: row.errorNotes,
    didWell: row.didWell,
    nextImprovement: row.nextImprovement,
    grossPnl: decimal(row.grossPnl),
    netPnl: decimal(row.netPnl),
    pnlCny: decimal(row.pnlCny),
    rMultiple: decimal(row.rMultiple),
    holdMinutes: row.holdMinutes,
    isWinning: row.isWinning,
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
    deletedAt: iso(row.deletedAt),
  };
}

function attachmentView(row: typeof tradeAttachments.$inferSelect): TradeAttachment {
  return {
    id: row.id,
    tradeId: row.tradeId,
    fileName: row.fileName,
    contentType: row.contentType,
    size: row.size,
    width: row.width,
    height: row.height,
    sortOrder: row.sortOrder,
    isCover: row.isCover,
    fileUrl: `/api/trading/files/${row.id}`,
    createdAt: iso(row.createdAt)!,
  };
}

export async function hydrateTrades(event: H3Event, rows: TradeRow[]) {
  if (!rows.length) return [];
  const db = getTradingDb(event);
  const ids = rows.map((row) => row.id);
  const [attachmentRows, tagRows] = await Promise.all([
    db.select().from(tradeAttachments)
      .where(inArray(tradeAttachments.tradeId, ids))
      .orderBy(asc(tradeAttachments.sortOrder), asc(tradeAttachments.createdAt)),
    db.select({
      tradeId: tradeErrorTags.tradeId,
      label: tradingOptions.label,
    }).from(tradeErrorTags)
      .innerJoin(tradingOptions, eq(tradingOptions.id, tradeErrorTags.optionId))
      .where(inArray(tradeErrorTags.tradeId, ids)),
  ]);
  return rows.map((row) => ({
    ...baseTrade(row),
    errorTags: tagRows.filter((tag) => tag.tradeId === row.id).map((tag) => tag.label),
    attachments: attachmentRows.filter((attachment) => attachment.tradeId === row.id).map(attachmentView),
  }));
}

export type TradeListFilters = {
  from?: string;
  to?: string;
  market?: string;
  status?: string;
  side?: string;
  strategy?: string;
  timeframe?: string;
  grade?: string;
  emotion?: string;
  errorTag?: string;
  query?: string;
  outcome?: "win" | "loss";
  includeDeleted?: boolean;
  limit?: number;
};

export async function listTrades(event: H3Event, filters: TradeListFilters = {}) {
  const db = getTradingDb(event);
  const conditions = [];
  if (filters.errorTag) {
    const taggedTrades = await db.select({ tradeId: tradeErrorTags.tradeId })
      .from(tradeErrorTags)
      .innerJoin(tradingOptions, eq(tradingOptions.id, tradeErrorTags.optionId))
      .where(eq(tradingOptions.label, filters.errorTag));
    if (!taggedTrades.length) return [];
    conditions.push(inArray(trades.id, taggedTrades.map((row) => row.tradeId)));
  }
  if (!filters.includeDeleted) conditions.push(isNull(trades.deletedAt));
  if (filters.from) conditions.push(gte(trades.tradeDate, filters.from));
  if (filters.to) conditions.push(lte(trades.tradeDate, filters.to));
  if (filters.market) conditions.push(eq(trades.market, filters.market));
  if (filters.status) conditions.push(eq(trades.status, filters.status));
  if (filters.side) conditions.push(eq(trades.side, filters.side));
  if (filters.strategy) conditions.push(eq(trades.strategy, filters.strategy));
  if (filters.timeframe) conditions.push(eq(trades.timeframe, filters.timeframe));
  if (filters.grade) conditions.push(eq(trades.executionGrade, filters.grade));
  if (filters.emotion) conditions.push(eq(trades.emotion, filters.emotion));
  if (filters.outcome) conditions.push(eq(trades.isWinning, filters.outcome === "win"));
  if (filters.query) {
    const search = `%${filters.query}%`;
    conditions.push(or(ilike(trades.symbol, search), ilike(trades.instrumentCode, search))!);
  }
  const rows = await db.select().from(trades)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(trades.tradeDate), desc(trades.entryAt))
    .limit(Math.min(Math.max(filters.limit ?? 250, 1), 1_000));
  return hydrateTrades(event, rows);
}

export async function getTrade(event: H3Event, id: string, includeDeleted = false) {
  const db = getTradingDb(event);
  const rows = await db.select().from(trades)
    .where(and(eq(trades.id, id), includeDeleted ? undefined : isNull(trades.deletedAt)))
    .limit(1);
  const hydrated = await hydrateTrades(event, rows);
  return hydrated[0] ?? null;
}

async function syncErrorTags(event: H3Event, tradeId: string, labels: string[]) {
  const db = getTradingDb(event);
  await db.delete(tradeErrorTags).where(eq(tradeErrorTags.tradeId, tradeId));
  if (!labels.length) return;
  await db.insert(tradingOptions).values(labels.map((label, index) => ({
    kind: "error_tag",
    label,
    sortOrder: index,
  }))).onConflictDoNothing();
  const options = await db.select().from(tradingOptions)
    .where(and(eq(tradingOptions.kind, "error_tag"), inArray(tradingOptions.label, labels)));
  if (options.length) {
    await db.insert(tradeErrorTags).values(options.map((option) => ({
      tradeId,
      optionId: option.id,
    }))).onConflictDoNothing();
  }
}

function tradeValues(input: TradeInput) {
  const calculation = calculateTrade(input);
  return {
    status: input.status,
    tradeDate: input.tradeDate,
    instrumentCode: input.instrumentCode ?? null,
    symbol: input.symbol,
    market: input.market,
    side: input.side,
    strategy: input.strategy,
    timeframe: input.timeframe,
    entryAt: new Date(input.entryAt),
    exitAt: input.exitAt ? new Date(input.exitAt) : null,
    entryReason: input.entryReason,
    exitReason: input.exitReason ?? null,
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice ?? null,
    positionSize: input.positionSize,
    positionBasis: input.positionBasis,
    settlementCurrency: input.settlementCurrency,
    plannedRiskAmount: input.plannedRiskAmount ?? null,
    fees: input.fees ?? "0",
    fxToCny: input.fxToCny,
    grossPnl: calculation.grossPnl,
    netPnl: calculation.netPnl,
    pnlCny: calculation.pnlCny,
    rMultiple: calculation.rMultiple,
    holdMinutes: calculation.holdMinutes,
    isWinning: calculation.isWinning,
    executionGrade: input.executionGrade ?? null,
    emotion: input.emotion ?? null,
    errorNotes: input.errorNotes ?? null,
    didWell: input.didWell ?? null,
    nextImprovement: input.nextImprovement ?? null,
  };
}

export async function createTrade(event: H3Event, input: TradeInput) {
  const db = getTradingDb(event);
  const [row] = await db.insert(trades).values(tradeValues(input)).returning();
  if (!row) throw createError({ statusCode: 500, message: "创建交易失败" });
  await syncErrorTags(event, row.id, input.errorTags ?? []);
  return (await getTrade(event, row.id))!;
}

export async function updateTrade(event: H3Event, id: string, input: TradeInput) {
  if (!input.updatedAt) throw createError({ statusCode: 400, message: "缺少版本时间，请重新加载" });
  const db = getTradingDb(event);
  const current = await getTrade(event, id);
  if (!current) throw createError({ statusCode: 404, message: "未找到交易记录" });
  if (current.updatedAt !== new Date(input.updatedAt).toISOString()) {
    throw createError({ statusCode: 409, message: "记录已在其他页面更新，请重新加载" });
  }
  const [row] = await db.update(trades)
    .set({ ...tradeValues(input), updatedAt: new Date() })
    .where(and(eq(trades.id, id), eq(trades.updatedAt, new Date(input.updatedAt))))
    .returning();
  if (!row) throw createError({ statusCode: 409, message: "记录已在其他页面更新，请重新加载" });
  await syncErrorTags(event, id, input.errorTags ?? []);
  return (await getTrade(event, id))!;
}

export async function softDeleteTrade(event: H3Event, id: string, updatedAt?: string) {
  const db = getTradingDb(event);
  const conditions = [eq(trades.id, id), isNull(trades.deletedAt)];
  if (updatedAt) conditions.push(eq(trades.updatedAt, new Date(updatedAt)));
  const [row] = await db.update(trades)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: trades.id });
  if (!row) throw createError({ statusCode: 409, message: "记录不存在或已经变化，请重新加载" });
  return { deleted: true, id };
}

function aggregateMetrics(items: TradeView[]): DashboardMetrics {
  const closed = items.filter((trade) => trade.status === "closed" && trade.pnlCny !== null);
  const net = closed.reduce((sum, trade) => sum.plus(trade.pnlCny ?? 0), new Decimal(0));
  const winners = closed.filter((trade) => trade.isWinning);
  const losses = closed.filter((trade) => trade.netPnl !== null && new Decimal(trade.netPnl).lt(0));
  const totalRValues = closed.filter((trade) => trade.rMultiple !== null);
  const totalR = totalRValues.reduce((sum, trade) => sum.plus(trade.rMultiple ?? 0), new Decimal(0));
  const grossProfit = winners.reduce((sum, trade) => sum.plus(trade.pnlCny ?? 0), new Decimal(0));
  const grossLoss = losses.reduce((sum, trade) => sum.plus(new Decimal(trade.pnlCny ?? 0).abs()), new Decimal(0));
  const graded = closed.filter((trade) => trade.executionGrade);
  return {
    closedTrades: closed.length,
    openTrades: items.filter((trade) => trade.status === "open").length,
    netPnlCny: net.toDecimalPlaces(2).toString(),
    winRate: closed.length ? winners.length / closed.length : null,
    totalR: totalRValues.length ? totalR.toDecimalPlaces(2).toString() : null,
    averagePnlCny: closed.length ? net.div(closed.length).toDecimalPlaces(2).toString() : null,
    gradeARate: graded.length ? graded.filter((trade) => trade.executionGrade === "A").length / graded.length : null,
    profitFactor: grossLoss.gt(0) ? grossProfit.div(grossLoss).toDecimalPlaces(2).toString() : null,
  };
}

function breakdown(items: TradeView[], key: (trade: TradeView) => string | null | undefined): DashboardBreakdown[] {
  const groups = new Map<string, TradeView[]>();
  for (const trade of items.filter((item) => item.status === "closed")) {
    const label = key(trade) || "未填写";
    groups.set(label, [...(groups.get(label) ?? []), trade]);
  }
  return [...groups.entries()].map(([label, trades]) => {
    const winners = trades.filter((trade) => trade.isWinning).length;
    const pnl = trades.reduce((sum, trade) => sum.plus(trade.pnlCny ?? 0), new Decimal(0));
    return {
      label,
      count: trades.length,
      pnlCny: pnl.toDecimalPlaces(2).toString(),
      winRate: trades.length ? winners / trades.length : null,
    };
  }).sort((left, right) => new Decimal(right.pnlCny).cmp(left.pnlCny));
}

function distribution(items: TradeView[], values: (trade: TradeView) => string[]) {
  const counts = new Map<string, number>();
  for (const trade of items) {
    for (const value of values(trade).filter(Boolean)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);
}

export async function getDashboard(event: H3Event, from?: string, to?: string): Promise<TradingDashboard> {
  const items = await listTrades(event, { from, to, limit: 1_000 });
  const daily = new Map<string, { pnl: Decimal; count: number }>();
  for (const trade of items.filter((item) => item.status === "closed")) {
    const current = daily.get(trade.tradeDate) ?? { pnl: new Decimal(0), count: 0 };
    current.pnl = current.pnl.plus(trade.pnlCny ?? 0);
    current.count += 1;
    daily.set(trade.tradeDate, current);
  }
  const dates = [...new Set(items.map((trade) => trade.tradeDate))];
  const db = getTradingDb(event);
  const reviewedDates = dates.length
    ? (await db.select({ date: dailyReviews.reviewDate }).from(dailyReviews)
        .where(and(inArray(dailyReviews.reviewDate, dates), isNull(dailyReviews.deletedAt))))
        .map((row) => row.date)
    : [];
  return {
    metrics: aggregateMetrics(items),
    dailyPnl: [...daily.entries()]
      .map(([date, value]) => ({ date, pnlCny: value.pnl.toDecimalPlaces(2).toString(), count: value.count }))
      .sort((left, right) => left.date.localeCompare(right.date)),
    byMarket: breakdown(items, (trade) => trade.market === "crypto" ? "加密" : "A股"),
    byStrategy: breakdown(items, (trade) => trade.strategy),
    gradeDistribution: distribution(items, (trade) => trade.executionGrade ? [trade.executionGrade] : []),
    emotionDistribution: distribution(items, (trade) => trade.emotion ? [trade.emotion] : []),
    errorTagDistribution: distribution(items, (trade) => trade.errorTags ?? []),
    openTrades: items.filter((trade) => trade.status === "open").slice(0, 10),
    recentTrades: items.slice(0, 10),
    pendingDailyReviews: dates.filter((date) => !reviewedDates.includes(date)).sort().reverse().slice(0, 14),
  };
}

export async function getDailyReview(event: H3Event, reviewDate: string): Promise<DailyReviewView> {
  const db = getTradingDb(event);
  const [review] = await db.select().from(dailyReviews)
    .where(and(eq(dailyReviews.reviewDate, reviewDate), isNull(dailyReviews.deletedAt)))
    .limit(1);
  const dayTrades = await listTrades(event, { from: reviewDate, to: reviewDate, limit: 250 });
  const closedDayTrades = dayTrades.filter((trade) => trade.status === "closed");
  return {
    id: review?.id ?? "",
    reviewDate,
    marketPlan: review?.marketPlan ?? null,
    dailySummary: review?.dailySummary ?? null,
    bestTradeId: review?.bestTradeId ?? null,
    biggestMistake: review?.biggestMistake ?? null,
    tomorrowOneThing: review?.tomorrowOneThing ?? null,
    plannedOnly: review?.plannedOnly ?? null,
    followedStops: review?.followedStops ?? null,
    avoidedImpulseAdds: review?.avoidedImpulseAdds ?? null,
    avoidedRevengeTrading: review?.avoidedRevengeTrading ?? null,
    exitedAsPlanned: review?.exitedAsPlanned ?? null,
    priorityFix: review?.priorityFix ?? null,
    notes: review?.notes ?? null,
    screenshotComplete: closedDayTrades.length > 0
      && closedDayTrades.every((trade) => trade.attachments.length > 0),
    metrics: aggregateMetrics(dayTrades),
    trades: dayTrades,
    createdAt: iso(review?.createdAt ?? new Date())!,
    updatedAt: iso(review?.updatedAt ?? new Date())!,
  };
}

export async function saveDailyReview(event: H3Event, input: DailyReviewInput) {
  const db = getTradingDb(event);
  const [existing] = await db.select().from(dailyReviews)
    .where(eq(dailyReviews.reviewDate, input.reviewDate))
    .limit(1);
  if (existing && !input.updatedAt) {
    throw createError({ statusCode: 400, message: "缺少版本时间，请重新加载日复盘" });
  }
  if (existing && iso(existing.updatedAt) !== new Date(input.updatedAt!).toISOString()) {
    throw createError({ statusCode: 409, message: "日复盘已在其他页面更新，请重新加载" });
  }
  const values = {
    marketPlan: input.marketPlan ?? null,
    dailySummary: input.dailySummary ?? null,
    bestTradeId: input.bestTradeId || null,
    biggestMistake: input.biggestMistake ?? null,
    tomorrowOneThing: input.tomorrowOneThing ?? null,
    plannedOnly: input.plannedOnly ?? null,
    followedStops: input.followedStops ?? null,
    avoidedImpulseAdds: input.avoidedImpulseAdds ?? null,
    avoidedRevengeTrading: input.avoidedRevengeTrading ?? null,
    exitedAsPlanned: input.exitedAsPlanned ?? null,
    priorityFix: input.priorityFix ?? null,
    notes: input.notes ?? null,
    deletedAt: null,
    updatedAt: new Date(),
  };
  if (existing) {
    const [updated] = await db.update(dailyReviews).set(values)
      .where(and(eq(dailyReviews.id, existing.id), eq(dailyReviews.updatedAt, new Date(input.updatedAt!))))
      .returning({ id: dailyReviews.id });
    if (!updated) throw createError({ statusCode: 409, message: "日复盘已在其他页面更新，请重新加载" });
  } else {
    await db.insert(dailyReviews).values({ reviewDate: input.reviewDate, ...values });
  }
  return getDailyReview(event, input.reviewDate);
}

export async function getTradingOptions(event: H3Event): Promise<TradingOptionsResponse> {
  const db = getTradingDb(event);
  const [options, settings] = await Promise.all([
    db.select().from(tradingOptions).orderBy(asc(tradingOptions.kind), asc(tradingOptions.sortOrder), asc(tradingOptions.label)),
    db.select().from(tradingSettings),
  ]);
  const rate = settings.find((item) => item.key === "default_usdt_cny_rate")?.value ?? "7.2";
  return {
    options: options.map((option): TradingOption => ({
      id: option.id,
      kind: option.kind as TradingOption["kind"],
      label: option.label,
      active: option.active,
      sortOrder: option.sortOrder,
    })),
    settings: { defaultUsdtCnyRate: rate },
  };
}

export async function updateTradingOptions(
  event: H3Event,
  payload: { options?: Array<Pick<TradingOption, "kind" | "label" | "active" | "sortOrder">>; defaultUsdtCnyRate?: string },
) {
  const db = getTradingDb(event);
  for (const option of payload.options ?? []) {
    await db.insert(tradingOptions).values(option)
      .onConflictDoUpdate({
        target: [tradingOptions.kind, tradingOptions.label],
        set: { active: option.active, sortOrder: option.sortOrder, updatedAt: new Date() },
      });
  }
  if (payload.defaultUsdtCnyRate) {
    const value = new Decimal(payload.defaultUsdtCnyRate);
    if (!value.gt(0)) throw createError({ statusCode: 400, message: "默认汇率必须大于 0" });
    await db.insert(tradingSettings).values({
      key: "default_usdt_cny_rate",
      value: value.toString(),
    }).onConflictDoUpdate({
      target: tradingSettings.key,
      set: { value: value.toString(), updatedAt: new Date() },
    });
  }
  return getTradingOptions(event);
}

export async function insertAttachment(
  event: H3Event,
  input: {
    tradeId: string;
    pathname: string;
    blobUrl: string;
    fileName: string;
    contentType: string;
    size: number;
    width?: number | null;
    height?: number | null;
  },
) {
  const db = getTradingDb(event);
  const existing = await db.select({ count: tradeAttachments.id }).from(tradeAttachments)
    .where(eq(tradeAttachments.tradeId, input.tradeId));
  if (existing.length >= 10) throw createError({ statusCode: 400, message: "每笔交易最多上传 10 张截图" });
  await db.insert(tradeAttachments).values({
    ...input,
    width: input.width ?? null,
    height: input.height ?? null,
    sortOrder: existing.length,
    isCover: existing.length === 0,
  }).onConflictDoNothing();
}

export async function getAttachment(event: H3Event, id: string) {
  const db = getTradingDb(event);
  const [row] = await db.select().from(tradeAttachments)
    .where(eq(tradeAttachments.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateAttachment(
  event: H3Event,
  tradeId: string,
  id: string,
  input: { sortOrder?: number; isCover?: boolean },
) {
  const db = getTradingDb(event);
  if (input.isCover) {
    await db.update(tradeAttachments).set({ isCover: false })
      .where(eq(tradeAttachments.tradeId, tradeId));
  }
  const [row] = await db.update(tradeAttachments).set({
    ...(typeof input.sortOrder === "number" ? { sortOrder: input.sortOrder } : {}),
    ...(typeof input.isCover === "boolean" ? { isCover: input.isCover } : {}),
    updatedAt: new Date(),
  }).where(and(eq(tradeAttachments.id, id), eq(tradeAttachments.tradeId, tradeId))).returning();
  if (!row) throw createError({ statusCode: 404, message: "未找到截图" });
  return attachmentView(row);
}

export async function deleteAttachmentRecord(event: H3Event, tradeId: string, id: string) {
  const db = getTradingDb(event);
  const [row] = await db.delete(tradeAttachments)
    .where(and(eq(tradeAttachments.id, id), eq(tradeAttachments.tradeId, tradeId)))
    .returning();
  if (!row) throw createError({ statusCode: 404, message: "未找到截图" });
  return row;
}

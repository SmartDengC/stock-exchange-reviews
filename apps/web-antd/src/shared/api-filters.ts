import type { TradeListFilters } from "./types/trading";

/**
 * 从 URL query 参数中解析交易列表筛选条件
 * 需要由调用方传入已解析的 query 对象
 */
export function buildTradeListFilters(query: Record<string, unknown>): TradeListFilters {
  return {
    from: typeof query.from === "string" ? query.from : undefined,
    to: typeof query.to === "string" ? query.to : undefined,
    market: typeof query.market === "string" ? query.market : undefined,
    status: typeof query.status === "string" ? query.status : undefined,
    side: typeof query.side === "string" ? query.side : undefined,
    strategy: typeof query.strategy === "string" ? query.strategy : undefined,
    timeframe: typeof query.timeframe === "string" ? query.timeframe : undefined,
    grade: typeof query.grade === "string" ? query.grade : undefined,
    emotion: typeof query.emotion === "string" ? query.emotion : undefined,
    errorTag: typeof query.errorTag === "string" ? query.errorTag : undefined,
    query: typeof query.q === "string" ? query.q : undefined,
    outcome: query.outcome === "win" || query.outcome === "loss" ? query.outcome : undefined,
  };
}

/**
 * 统一解析日期范围参数
 */
export function buildDateRange(query: Record<string, unknown>) {
  return {
    from: typeof query.from === "string" ? query.from : undefined,
    to: typeof query.to === "string" ? query.to : undefined,
  };
}

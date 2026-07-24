import { getQuery } from "h3";
import { requireActiveAdminSession } from "../../../utils/review-api";
import { listTrades } from "../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  await requireActiveAdminSession(event);
  const query = getQuery(event);
  return {
    trades: await listTrades(event, {
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
    }),
  };
});

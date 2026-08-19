import { getQuery } from "h3";
import { buildTradeListFilters } from "~~/shared/api-filters";
import { listTrades } from "../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const filters = buildTradeListFilters(query as Record<string, unknown>);
  return await listTrades(event, filters);
});

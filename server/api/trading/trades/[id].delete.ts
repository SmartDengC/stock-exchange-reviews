import { getQuery, getRouterParam } from "h3";
import { assertSameOrigin } from "../../../utils/review-api";
import { softDeleteTrade } from "../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  const id = getRouterParam(event, "id") ?? "";
  const query = getQuery(event);
  const version = typeof query.version === "string" ? Number(query.version) : undefined;
  return softDeleteTrade(event, id, version);
});

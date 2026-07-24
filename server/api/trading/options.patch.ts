import { readBody } from "h3";
import { assertSameOrigin, requireActiveAdminSession } from "../../utils/review-api";
import { updateTradingOptions } from "../../utils/trading-repository";
import type { TradingOption } from "../../../shared/types/trading";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await requireActiveAdminSession(event);
  const body = await readBody<{
    options?: Array<Pick<TradingOption, "kind" | "label" | "active" | "sortOrder">>;
    defaultUsdtCnyRate?: string;
  }>(event);
  return updateTradingOptions(event, body ?? {});
});

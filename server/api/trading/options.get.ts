import { requireActiveAdminSession } from "../../utils/review-api";
import { getTradingOptions } from "../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  await requireActiveAdminSession(event);
  return getTradingOptions(event);
});

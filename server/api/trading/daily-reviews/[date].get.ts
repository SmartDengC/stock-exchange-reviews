import { getRouterParam } from "h3";
import { requireActiveAdminSession } from "../../../utils/review-api";
import { getDailyReview } from "../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  await requireActiveAdminSession(event);
  const date = getRouterParam(event, "date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createError({ statusCode: 400, message: "复盘日期不合法" });
  return getDailyReview(event, date);
});

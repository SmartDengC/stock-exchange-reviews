import { getRouterParam } from "h3";
import { requireActiveAdminSession } from "../../../utils/review-api";
import { getTrade } from "../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  await requireActiveAdminSession(event);
  const id = getRouterParam(event, "id") ?? "";
  const trade = await getTrade(event, id);
  if (!trade) throw createError({ statusCode: 404, message: "未找到交易记录" });
  return trade;
});

import { getRouterParam } from "h3";
import { getTrade } from "../../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const trade = await getTrade(event, id);
  if (!trade) throw createError({ statusCode: 404, message: "未找到交易记录" });
  return trade;
});

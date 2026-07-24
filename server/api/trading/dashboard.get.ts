import { getQuery } from "h3";
import { requireActiveAdminSession } from "../../utils/review-api";
import { getDashboard } from "../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  await requireActiveAdminSession(event);
  const query = getQuery(event);
  return getDashboard(
    event,
    typeof query.from === "string" ? query.from : undefined,
    typeof query.to === "string" ? query.to : undefined,
  );
});

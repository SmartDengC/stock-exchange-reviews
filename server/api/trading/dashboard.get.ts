import { getQuery } from "h3";
import { getDashboard } from "../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  return getDashboard(
    event,
    typeof query.from === "string" ? query.from : undefined,
    typeof query.to === "string" ? query.to : undefined,
  );
});

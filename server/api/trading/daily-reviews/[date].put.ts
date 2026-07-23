import { getRouterParam, readBody } from "h3";
import { assertSameOrigin, requireActiveAdminSession } from "../../../utils/review-api";
import { saveDailyReview } from "../../../utils/trading-repository";
import { throwTradingError, validateDailyReviewInput } from "../../../utils/trading-validation";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await requireActiveAdminSession(event);
  try {
    const date = getRouterParam(event, "date") ?? "";
    return await saveDailyReview(event, validateDailyReviewInput(await readBody(event), date));
  } catch (error) {
    throwTradingError(error);
  }
});

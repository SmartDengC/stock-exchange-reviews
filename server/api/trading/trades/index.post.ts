import { readBody } from "h3";
import { assertSameOrigin, requireActiveAdminSession } from "../../../utils/review-api";
import { createTrade } from "../../../utils/trading-repository";
import { throwTradingError, validateTradeInput } from "../../../utils/trading-validation";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  await requireActiveAdminSession(event);
  try {
    return await createTrade(event, validateTradeInput(await readBody(event)));
  } catch (error) {
    throwTradingError(error);
  }
});

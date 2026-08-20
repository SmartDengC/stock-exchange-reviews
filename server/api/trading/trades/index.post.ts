import { readBody } from "h3";
import { assertSameOrigin } from "../../../utils/assert-same-origin";
import { createTrade } from "../../../utils/trading-repository";
import { throwTradingError, validateTradeInput } from "../../../utils/trading-validation";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  try {
    return await createTrade(event, validateTradeInput(await readBody(event)));
  } catch (error) {
    throwTradingError(error);
  }
});

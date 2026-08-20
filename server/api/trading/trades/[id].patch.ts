import { getRouterParam, readBody } from "h3";
import { assertSameOrigin } from "../../../utils/assert-same-origin";
import { updateTrade } from "../../../utils/trading-repository";
import { throwTradingError, validateTradeInput } from "../../../utils/trading-validation";

export default defineEventHandler(async (event) => {
  assertSameOrigin(event);
  const id = getRouterParam(event, "id") ?? "";
  try {
    return await updateTrade(event, id, validateTradeInput(await readBody(event)));
  } catch (error) {
    throwTradingError(error);
  }
});

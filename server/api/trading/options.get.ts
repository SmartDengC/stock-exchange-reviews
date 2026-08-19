import { getTradingOptions } from "../../utils/trading-repository";

export default defineEventHandler(async (event) => {
  return getTradingOptions(event);
});

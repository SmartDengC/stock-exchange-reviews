import { describe, expect, it } from "vitest";
import { TradingValidationError, validateTradeInput } from "../server/utils/trading-validation";

const validTrade = {
  status: "closed",
  tradeDate: "2026-07-23",
  symbol: "MUUSDT",
  market: "crypto",
  side: "short",
  strategy: "趋势突破",
  timeframe: "5分钟",
  entryAt: "2026-07-23T01:00:00.000Z",
  exitAt: "2026-07-23T02:00:00.000Z",
  entryReason: "趋势延续",
  exitReason: "止损",
  entryPrice: "100",
  exitPrice: "101",
  positionSize: "200",
  positionBasis: "notional",
  settlementCurrency: "USDT",
  fees: "0.04",
  fxToCny: "7.2",
};

describe("trading input validation", () => {
  it("normalizes CNY FX to one and deduplicates tags", () => {
    const result = validateTradeInput({
      ...validTrade,
      market: "a_share",
      settlementCurrency: "CNY",
      fxToCny: "8",
      errorTags: ["止损犹豫", "止损犹豫"],
      errorNotes: "止损位置判断错误",
    });
    expect(result.fxToCny).toBe("1");
    expect(result.errorTags).toEqual(["止损犹豫"]);
    expect(result.errorNotes).toBe("止损位置判断错误");
  });

  it("allows open trades without exit fields", () => {
    const result = validateTradeInput({
      ...validTrade,
      status: "open",
      exitAt: "",
      exitPrice: "",
      exitReason: "",
    });
    expect(result.exitAt).toBeNull();
    expect(result.exitPrice).toBeNull();
    expect(result.exitReason).toBeNull();
  });

  it("rejects a closed trade without an exit reason", () => {
    expect(() => validateTradeInput({ ...validTrade, exitReason: "" }))
      .toThrowError(new TradingValidationError("已平仓交易必须填写平仓时间、平仓价和出场理由"));
  });

  it("rejects an exit before entry", () => {
    expect(() => validateTradeInput({
      ...validTrade,
      exitAt: "2026-07-22T23:00:00.000Z",
    })).toThrow("平仓时间不能早于开仓时间");
  });
});

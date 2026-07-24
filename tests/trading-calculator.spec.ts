import { describe, expect, it } from "vitest";
import { calculateTrade } from "../shared/trading-calculator";
import type { TradeInput } from "../shared/types/trading";

function trade(overrides: Partial<TradeInput> = {}): TradeInput {
  return {
    status: "closed",
    tradeDate: "2026-07-23",
    symbol: "TEST",
    market: "crypto",
    side: "long",
    strategy: "趋势突破",
    timeframe: "5分钟",
    entryAt: "2026-07-23T01:00:00.000Z",
    exitAt: "2026-07-23T02:30:00.000Z",
    entryReason: "突破",
    exitReason: "按计划离场",
    entryPrice: "100",
    exitPrice: "110",
    positionSize: "1000",
    positionBasis: "notional",
    settlementCurrency: "USDT",
    plannedRiskAmount: "20",
    fees: "2",
    fxToCny: "7.2",
    ...overrides,
  };
}

describe("trade calculator", () => {
  it("calculates long notional P&L, fees, FX snapshot, R and holding time", () => {
    expect(calculateTrade(trade())).toEqual({
      grossPnl: "100",
      netPnl: "98",
      pnlCny: "705.6",
      rMultiple: "4.9",
      holdMinutes: 90,
      isWinning: true,
    });
  });

  it("calculates a short quantity trade", () => {
    expect(calculateTrade(trade({
      side: "short",
      market: "a_share",
      entryPrice: "10",
      exitPrice: "9.5",
      positionSize: "1000",
      positionBasis: "quantity",
      settlementCurrency: "CNY",
      fees: "12",
      fxToCny: "1",
      plannedRiskAmount: null,
    }))).toMatchObject({
      grossPnl: "500",
      netPnl: "488",
      pnlCny: "488",
      rMultiple: null,
      isWinning: true,
    });
  });

  it("excludes open trades from all outcome metrics", () => {
    expect(calculateTrade(trade({
      status: "open",
      exitAt: null,
      exitPrice: null,
      exitReason: null,
    }))).toEqual({
      grossPnl: null,
      netPnl: null,
      pnlCny: null,
      rMultiple: null,
      holdMinutes: null,
      isWinning: null,
    });
  });

  it("rounds holding time across a day boundary and never returns a negative duration", () => {
    expect(calculateTrade(trade({
      entryAt: "2026-07-23T23:50:00.000Z",
      exitAt: "2026-07-24T00:10:29.000Z",
    })).holdMinutes).toBe(20);
    expect(calculateTrade(trade({
      entryAt: "2026-07-24T00:10:00.000Z",
      exitAt: "2026-07-23T23:50:00.000Z",
    })).holdMinutes).toBe(0);
  });
});

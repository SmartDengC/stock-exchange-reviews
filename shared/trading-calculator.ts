import Decimal from "decimal.js";
import type { TradeInput } from "./types/trading";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type TradeCalculation = {
  grossPnl: string | null;
  netPnl: string | null;
  pnlCny: string | null;
  rMultiple: string | null;
  holdMinutes: number | null;
  isWinning: boolean | null;
};

function decimal(value: string | null | undefined, fallback?: string) {
  const candidate = value ?? fallback;
  if (candidate === undefined || candidate === "") return null;
  try {
    return new Decimal(candidate);
  } catch {
    return null;
  }
}

function clean(value: Decimal | null) {
  if (!value) return null;
  return value.toDecimalPlaces(10).toString();
}

export function calculateTrade(input: TradeInput): TradeCalculation {
  if (input.status !== "closed" || !input.exitAt || !input.exitPrice) {
    return {
      grossPnl: null,
      netPnl: null,
      pnlCny: null,
      rMultiple: null,
      holdMinutes: null,
      isWinning: null,
    };
  }

  const entryPrice = decimal(input.entryPrice);
  const exitPrice = decimal(input.exitPrice);
  const positionSize = decimal(input.positionSize);
  const fees = decimal(input.fees, "0");
  const fxToCny = decimal(input.fxToCny);
  if (!entryPrice || !exitPrice || !positionSize || !fees || !fxToCny || entryPrice.isZero()) {
    throw new Error("交易计算字段不完整");
  }

  const direction = input.side === "long" ? new Decimal(1) : new Decimal(-1);
  const priceDelta = exitPrice.minus(entryPrice).times(direction);
  const grossPnl = input.positionBasis === "quantity"
    ? priceDelta.times(positionSize)
    : priceDelta.div(entryPrice).times(positionSize);
  const netPnl = grossPnl.minus(fees);
  const pnlCny = netPnl.times(fxToCny);
  const risk = decimal(input.plannedRiskAmount);
  const rMultiple = risk && risk.gt(0) ? netPnl.div(risk) : null;
  const entryTime = Date.parse(input.entryAt);
  const exitTime = Date.parse(input.exitAt);
  const holdMinutes = Number.isFinite(entryTime) && Number.isFinite(exitTime)
    ? Math.max(0, Math.round((exitTime - entryTime) / 60_000))
    : null;

  return {
    grossPnl: clean(grossPnl),
    netPnl: clean(netPnl),
    pnlCny: clean(pnlCny),
    rMultiple: clean(rMultiple),
    holdMinutes,
    isWinning: netPnl.gt(0),
  };
}

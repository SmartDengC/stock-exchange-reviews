import type { TradeInput } from "./types/trading";

import Decimal from "decimal.js";

// 配置 Decimal 精度：40 位有效数字，采用四舍五入（ROUND_HALF_UP）
// 确保金融计算的高精度，避免浮点数误差
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/**
 * 交易计算结果类型
 * @property grossPnl 毛盈亏（未扣除手续费），未平仓时为 null
 * @property holdMinutes 持仓时长（分钟），未平仓时为 null
 * @property isWinning 是否盈利（净盈亏 > 0），未平仓时为 null
 * @property netPnl 净盈亏（扣除手续费后），未平仓时为 null
 * @property pnlCny 人民币盈亏（净盈亏 × 汇率），未平仓时为 null
 * @property rMultiple R 倍数（净盈亏 / 计划风险金额），未设置风险时为 null
 */
export type TradeCalculation = {
  grossPnl: null | string;
  holdMinutes: null | number;
  isWinning: boolean | null;
  netPnl: null | string;
  pnlCny: null | string;
  rMultiple: null | string;
};

/**
 * 安全解析字符串为 Decimal 对象
 * @param value 待解析的字符串值
 * @param fallback 当 value 为空时的默认值
 * @returns Decimal 对象，解析失败或值为空时返回 null
 */
function decimal(value: null | string | undefined, fallback?: string) {
  const candidate = value ?? fallback;
  if (candidate === undefined || candidate === "") return null;
  try {
    return new Decimal(candidate);
  } catch {
    return null;
  }
}

/**
 * 清理 Decimal 结果，保留 10 位小数并转换为字符串
 * @param value Decimal 对象
 * @returns 清理后的字符串，值为 null 时返回 null
 */
function clean(value: Decimal | null) {
  if (!value) return null;
  return value.toDecimalPlaces(10).toString();
}

/**
 * 计算交易盈亏及相关指标（核心计算逻辑）
 * 
 * 计算公式：
 * 1. 毛盈亏 = (exitPrice - entryPrice) × direction × positionSize
 *    - direction: 多头为 1，空头为 -1
 *    - positionBasis 为 quantity 时：直接乘以持仓数量
 *    - positionBasis 为 notional 时：先除以 entryPrice 再乘以名义金额
 * 2. 净盈亏 = 毛盈亏 - fees
 * 3. 人民币盈亏 = 净盈亏 × fxToCny
 * 4. R 倍数 = 净盈亏 / plannedRiskAmount
 * 
 * @param input 交易输入数据
 * @returns 交易计算结果
 * @throws Error 当必要字段缺失时抛出异常
 */
export function calculateTrade(input: TradeInput): TradeCalculation {
  // 未平仓的交易无法计算盈亏，返回全 null
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

  // 解析并验证必要字段
  const entryPrice = decimal(input.entryPrice);
  const exitPrice = decimal(input.exitPrice);
  const positionSize = decimal(input.positionSize);
  const fees = decimal(input.fees, "0");  // 手续费默认为 0
  const fxToCny = decimal(input.fxToCny);
  if (!entryPrice || !exitPrice || !positionSize || !fees || !fxToCny || entryPrice.isZero()) {
    throw new Error("交易计算字段不完整");
  }

  // 计算方向系数：多头为 1，空头为 -1
  const direction = input.side === "long" ? new Decimal(1) : new Decimal(-1);
  
  // 计算价格差 × 方向：多头时 (exit - entry)，空头时 (entry - exit)
  const priceDelta = exitPrice.minus(entryPrice).times(direction);
  
  // 计算毛盈亏
  // positionBasis = "quantity": 按持仓数量计算，grossPnl = priceDelta × positionSize
  // positionBasis = "notional": 按名义金额计算，grossPnl = priceDelta / entryPrice × positionSize
  const grossPnl = input.positionBasis === "quantity"
    ? priceDelta.times(positionSize)
    : priceDelta.div(entryPrice).times(positionSize);
  
  // 计算净盈亏（扣除手续费）
  const netPnl = grossPnl.minus(fees);
  
  // 计算人民币盈亏（净盈亏 × 汇率）
  const pnlCny = netPnl.times(fxToCny);
  
  // 计算 R 倍数（净盈亏 / 计划风险金额），仅当风险金额 > 0 时计算
  const risk = decimal(input.plannedRiskAmount);
  const rMultiple = risk && risk.gt(0) ? netPnl.div(risk) : null;
  
  // 计算持仓时长（分钟）
  const entryTime = Date.parse(input.entryAt);
  const exitTime = Date.parse(input.exitAt);
  const holdMinutes = Number.isFinite(entryTime) && Number.isFinite(exitTime)
    ? Math.max(0, Math.round((exitTime - entryTime) / 60_000))  // 毫秒转换为分钟，向上取整
    : null;

  return {
    grossPnl: clean(grossPnl),
    netPnl: clean(netPnl),
    pnlCny: clean(pnlCny),
    rMultiple: clean(rMultiple),
    holdMinutes,
    isWinning: netPnl.gt(0),  // 净盈亏 > 0 为盈利
  };
}

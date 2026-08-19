/**
 * 共享标签映射函数，用于前后端统一
 */

export function marketLabel(value: string): string {
  return value === "crypto" ? "加密" : "A 股";
}

export function sideLabel(value: string): string {
  return value === "long" ? "做多" : "做空";
}

export function statusLabel(value: string): string {
  return value === "closed" ? "已平仓" : "未平仓";
}

export function basisLabel(value: string): string {
  return value === "quantity" ? "数量" : "金额";
}

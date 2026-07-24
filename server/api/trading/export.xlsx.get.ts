import ExcelJS from "exceljs";
import { and, asc, gte, isNull, lte } from "drizzle-orm";
import { dailyReviews } from "../../../db/schema";
import { getRequestURL, send, setResponseHeader } from "h3";
import { requireActiveAdminSession } from "../../utils/review-api";
import { getTradingDb } from "../../utils/trading-db";
import { listTrades } from "../../utils/trading-repository";

const headers = [
  "日期", "合约/证券代码", "标的", "市场", "方向", "策略类型", "周期", "开仓时间", "平仓时间",
  "持仓分钟", "入场理由", "出场理由", "开仓价", "平仓价", "仓位/名义金额", "仓位口径",
  "结算币种", "计划风险金额", "手续费税费", "毛盈亏", "净盈亏", "净盈亏（元）", "盈亏R倍",
  "是否盈利", "执行评分", "情绪状态", "错误标签", "错误复盘", "做对了什么", "下次改进", "当天交易总结",
  "截图链接", "状态", "逐笔人民币汇率",
];

function marketLabel(value: string) {
  return value === "crypto" ? "加密" : "A股";
}

function sideLabel(value: string) {
  return value === "long" ? "做多" : "做空";
}

function basisLabel(value: string) {
  return value === "quantity" ? "数量" : "金额";
}

function statusLabel(value: string) {
  return value === "closed" ? "已平仓" : "未平仓";
}

export default defineEventHandler(async (event) => {
  await requireActiveAdminSession(event);
  const query = getQuery(event);
  const from = typeof query.from === "string" ? query.from : undefined;
  const to = typeof query.to === "string" ? query.to : undefined;
  const reviewConditions = [isNull(dailyReviews.deletedAt)];
  if (from) reviewConditions.push(gte(dailyReviews.reviewDate, from));
  if (to) reviewConditions.push(lte(dailyReviews.reviewDate, to));
  const [items, reviewRows] = await Promise.all([
    listTrades(event, { from, to, limit: 1_000 }),
    getTradingDb(event).select().from(dailyReviews)
      .where(and(...reviewConditions))
      .orderBy(asc(dailyReviews.reviewDate)),
  ]);
  const reviewByDate = new Map(reviewRows.map((review) => [review.reviewDate, review]));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "市场日记 · 私有交易复盘系统";
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const detail = workbook.addWorksheet("交易明细", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 1 }],
    properties: { defaultRowHeight: 22 },
  });
  detail.addRow(headers);
  const origin = getRequestURL(event).origin;

  items.forEach((trade, index) => {
    const rowNumber = index + 2;
    const review = reviewByDate.get(trade.tradeDate);
    detail.addRow([
      new Date(`${trade.tradeDate}T00:00:00+08:00`),
      trade.instrumentCode,
      trade.symbol,
      marketLabel(trade.market),
      sideLabel(trade.side),
      trade.strategy,
      trade.timeframe,
      new Date(trade.entryAt),
      trade.exitAt ? new Date(trade.exitAt) : null,
      { formula: `IF(OR(H${rowNumber}="",I${rowNumber}=""),"",ROUND((I${rowNumber}-H${rowNumber})*1440,0))`, result: trade.holdMinutes ?? undefined },
      trade.entryReason,
      trade.exitReason,
      Number(trade.entryPrice),
      trade.exitPrice ? Number(trade.exitPrice) : null,
      Number(trade.positionSize),
      basisLabel(trade.positionBasis),
      trade.settlementCurrency,
      trade.plannedRiskAmount ? Number(trade.plannedRiskAmount) : null,
      Number(trade.fees ?? 0),
      {
        formula: `IF(OR(E${rowNumber}="",M${rowNumber}="",N${rowNumber}="",O${rowNumber}=""),"",IF(P${rowNumber}="数量",IF(E${rowNumber}="做多",(N${rowNumber}-M${rowNumber})*O${rowNumber},(M${rowNumber}-N${rowNumber})*O${rowNumber}),IF(M${rowNumber}=0,"",IF(E${rowNumber}="做多",(N${rowNumber}-M${rowNumber})/M${rowNumber}*O${rowNumber},(M${rowNumber}-N${rowNumber})/M${rowNumber}*O${rowNumber}))))`,
        result: trade.grossPnl ? Number(trade.grossPnl) : undefined,
      },
      { formula: `IF(T${rowNumber}="","",T${rowNumber}-S${rowNumber})`, result: trade.netPnl ? Number(trade.netPnl) : undefined },
      { formula: `IF(U${rowNumber}="","",U${rowNumber}*AH${rowNumber})`, result: trade.pnlCny ? Number(trade.pnlCny) : undefined },
      { formula: `IF(OR(U${rowNumber}="",R${rowNumber}="",R${rowNumber}=0),"",U${rowNumber}/R${rowNumber})`, result: trade.rMultiple ? Number(trade.rMultiple) : undefined },
      { formula: `IF(U${rowNumber}="","",IF(U${rowNumber}>0,"是","否"))`, result: trade.isWinning === null ? undefined : trade.isWinning ? "是" : "否" },
      trade.executionGrade,
      trade.emotion,
      trade.errorTags?.join("、") ?? "",
      trade.errorNotes,
      trade.didWell,
      trade.nextImprovement,
      review?.dailySummary ?? null,
      trade.attachments.map((attachment) => `${origin}${attachment.fileUrl}`).join("\n"),
      statusLabel(trade.status),
      Number(trade.fxToCny),
    ]);
  });

  const header = detail.getRow(1);
  header.height = 30;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16324F" } };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  detail.autoFilter = { from: "A1", to: "AH1" };
  detail.columns.forEach((column, index) => {
    column.width = [12, 16, 24, 10, 10, 16, 10, 19, 19, 12, 36, 30, 14, 14, 18, 12, 12, 16, 14, 14, 14, 16, 12, 12, 12, 12, 24, 36, 32, 32, 36, 48, 12, 16][index] ?? 14;
  });
  detail.getColumn("A").numFmt = "yyyy-mm-dd";
  detail.getColumn("H").numFmt = "yyyy-mm-dd hh:mm";
  detail.getColumn("I").numFmt = "yyyy-mm-dd hh:mm";
  for (const column of ["M", "N", "O", "R", "S", "T", "U", "V", "W", "AH"]) {
    detail.getColumn(column).numFmt = "#,##0.0000;[Red](#,##0.0000);-";
  }
  detail.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: rowNumber % 2 ? "FFF8FAFC" : "FFFFFFFF" },
    };
  });

  const daily = workbook.addWorksheet("每日复盘", { views: [{ state: "frozen", ySplit: 1 }] });
  daily.columns = [
    { header: "日期", key: "date", width: 14 },
    { header: "市场环境 / 盘前计划", key: "plan", width: 44 },
    { header: "每日总结", key: "summary", width: 44 },
    { header: "最大失误与原因", key: "mistake", width: 38 },
    { header: "明日只改一件事", key: "tomorrow", width: 38 },
    { header: "只做计划内交易", key: "planned", width: 18 },
    { header: "严格执行止损", key: "stops", width: 18 },
    { header: "无临盘加仓冲动", key: "adds", width: 18 },
    { header: "无报复性交易", key: "revenge", width: 18 },
    { header: "按计划离场", key: "exit", width: 18 },
    { header: "优先修正项", key: "priority", width: 30 },
    { header: "备注", key: "notes", width: 30 },
  ];
  for (const review of reviewRows) {
    daily.addRow({
      date: new Date(`${review.reviewDate}T00:00:00+08:00`),
      plan: review.marketPlan,
      summary: review.dailySummary,
      mistake: review.biggestMistake,
      tomorrow: review.tomorrowOneThing,
      planned: review.plannedOnly === null ? "" : review.plannedOnly ? "是" : "否",
      stops: review.followedStops === null ? "" : review.followedStops ? "是" : "否",
      adds: review.avoidedImpulseAdds === null ? "" : review.avoidedImpulseAdds ? "是" : "否",
      revenge: review.avoidedRevengeTrading === null ? "" : review.avoidedRevengeTrading ? "是" : "否",
      exit: review.exitedAsPlanned === null ? "" : review.exitedAsPlanned ? "是" : "否",
      priority: review.priorityFix,
      notes: review.notes,
    });
  }
  daily.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  daily.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16324F" } };
  daily.getColumn("A").numFmt = "yyyy-mm-dd";
  daily.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });

  const summary = workbook.addWorksheet("统计摘要");
  summary.mergeCells("A1:D1");
  summary.getCell("A1").value = "私有交易复盘 · 导出摘要";
  summary.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 };
  summary.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123B5D" } };
  summary.addRows([
    [],
    ["指标", "数值"],
    ["交易总数", { formula: `COUNTA('交易明细'!A2:A${items.length + 1})` }],
    ["已平仓交易", { formula: `COUNTIF('交易明细'!AG2:AG${items.length + 1},"已平仓")` }],
    ["净盈亏（元）", { formula: `SUM('交易明细'!V2:V${items.length + 1})` }],
    ["盈利笔数", { formula: `COUNTIF('交易明细'!X2:X${items.length + 1},"是")` }],
    ["胜率", { formula: `IF(B5=0,"",B7/B5)` }],
  ]);
  summary.getRow(3).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF38597A" } };
  summary.getColumn("A").width = 24;
  summary.getColumn("B").width = 22;
  summary.getCell("B6").numFmt = "#,##0.00;[Red](#,##0.00);-";
  summary.getCell("B8").numFmt = "0.0%";

  const output = await workbook.xlsx.writeBuffer();
  const suffix = [from, to].filter(Boolean).join("_") || new Date().toISOString().slice(0, 10);
  setResponseHeader(event, "Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  setResponseHeader(event, "Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(`交易复盘_${suffix}.xlsx`)}`);
  setResponseHeader(event, "Cache-Control", "private, no-store");
  return send(event, Buffer.from(output));
});

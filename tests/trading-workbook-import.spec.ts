import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import { parseTradingWorkbook } from "../scripts/import-trading-workbook.mjs";

const temporaryDirectories: string[] = [];
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7z8AAAAASUVORK5CYII=",
  "base64",
);

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function fixtureWorkbook() {
  const directory = await mkdtemp(join(tmpdir(), "trading-import-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "fixture.xlsx");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("交易明细");
  sheet.getRow(3).values = [
    "日期", "交易编号", "标的", "市场", "方向", "策略类型", "周期", "开仓时间", "平仓时间",
    "持仓分钟", "入场理由", "出场理由", "开仓价", "平仓价", "仓位/名义金额", "仓位口径",
    "结算币种", "计划风险金额", "手续费税费", "毛盈亏", "净盈亏", "净盈亏（元）", "盈亏R倍",
    "是否盈利", "执行评分", "情绪状态", "错误标签", "做对了什么", "下次改进", "当天交易总结",
    "截图/链接",
  ];
  sheet.getRow(4).values = [
    new Date(2026, 6, 23), "MUUSDT", "MUUSDT", "加密", "做多", "趋势突破", "5分",
    new Date("2026-07-23T01:00:00.000Z"), new Date("2026-07-23T02:00:00.000Z"), null,
    "突破", "止盈", 100, 110, 1000, "金额", "USDT", 20, 2,
    null, null, null, null, null, "A", "平静", "", "执行到位", "继续等待确认", "首笔总结",
  ];
  sheet.getRow(5).values = [
    null, null, null, "加密", "做空", "区间反转", "1分",
    new Date("2026-07-23T03:00:00.000Z"), new Date("2026-07-23T03:10:00.000Z"), null,
    "假突破", "止损", 100, 101, 200, "金额", "USDT", null, 0.1,
    null, null, null, null, null, "C", "急躁", "追涨后止损犹豫", "", "等待收线", "",
  ];
  const imageId = workbook.addImage({ buffer: tinyPng, extension: "png" });
  sheet.addImage(imageId, { tl: { col: 30, row: 4 }, ext: { width: 1, height: 1 } });
  sheet.addImage(imageId, { tl: { col: 30.2, row: 4.2 }, ext: { width: 1, height: 1 } });
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(path, Buffer.from(buffer));
  return path;
}

describe("trading workbook migration", () => {
  it("fills visual grouping fields, maps multiple images and splits daily summaries", async () => {
    const path = await fixtureWorkbook();
    const parsed = await parseTradingWorkbook(path);
    expect(parsed.trades).toHaveLength(2);
    expect(parsed.trades[1]).toMatchObject({
      tradeDate: "2026-07-23",
      instrumentCode: "MUUSDT",
      symbol: "MUUSDT",
      sourceRow: 5,
      errorNotes: "追涨后止损犹豫",
    });
    expect(parsed.trades[1].errorTags).toEqual(expect.arrayContaining(["追涨杀跌", "止损犹豫"]));
    expect(parsed.attachments).toHaveLength(2);
    expect(parsed.attachments.every((attachment) => attachment.sourceRow === 5)).toBe(true);
    expect(parsed.dailyReviews).toEqual([{ reviewDate: "2026-07-23", dailySummary: "首笔总结" }]);
  });

  it("produces stable file hashes and source rows for repeat-import deduplication", async () => {
    const path = await fixtureWorkbook();
    const first = await parseTradingWorkbook(path);
    const second = await parseTradingWorkbook(path);
    expect(second.sourceHash).toBe(first.sourceHash);
    expect(second.trades.map((trade) => trade.sourceRow)).toEqual(first.trades.map((trade) => trade.sourceRow));
  });
});

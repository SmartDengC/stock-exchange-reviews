import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import Decimal from "decimal.js";
import ExcelJS from "exceljs";

const DEFAULT_WORKBOOK = "reviews_trading/币安+A股每日交易复盘模板-优化.xlsx";
const TRADE_SHEET = "交易明细";

function cellValue(cell, { formulas = false } = {}) {
  const value = cell?.value;
  if (value && typeof value === "object" && "formula" in value) {
    return formulas ? value.result ?? null : null;
  }
  return value ?? null;
}

function textValue(cell, options) {
  const value = cellValue(cell, options);
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function numberValue(cell) {
  const value = cellValue(cell);
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(value) : null;
}

function localDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timestampValue(cell) {
  const value = cellValue(cell);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }
  return "";
}

function inferErrorTags(notes) {
  const rules = [
    ["追涨杀跌", /追|高点入|条件单没有触发/],
    ["计划外交易", /计划外|没有计划/],
    ["止损犹豫", /止损|不敢|犹豫/],
    ["过早止盈", /过早止盈|提前止盈/],
    ["冲动加仓", /加仓/],
    ["报复性交易", /报复/],
    ["仓位过重", /仓位|大仓位/],
    ["逆势交易", /逆势|反弹看成反转/],
    ["未按计划离场", /误点|被迫.*离场/],
  ];
  return rules.filter(([, pattern]) => pattern.test(notes)).map(([label]) => label);
}

export function calculateImportedTrade(trade) {
  if (trade.status !== "closed" || !trade.exitPrice || !trade.exitAt) {
    return {
      grossPnl: null,
      netPnl: null,
      pnlCny: null,
      rMultiple: null,
      holdMinutes: null,
      isWinning: null,
    };
  }
  const entry = new Decimal(trade.entryPrice);
  const exit = new Decimal(trade.exitPrice);
  const size = new Decimal(trade.positionSize);
  const direction = trade.side === "long" ? new Decimal(1) : new Decimal(-1);
  const gross = trade.positionBasis === "quantity"
    ? exit.minus(entry).times(size).times(direction)
    : exit.minus(entry).div(entry).times(size).times(direction);
  const net = gross.minus(new Decimal(trade.fees || 0));
  const pnlCny = net.times(new Decimal(trade.fxToCny));
  const risk = trade.plannedRiskAmount ? new Decimal(trade.plannedRiskAmount) : null;
  const holdMinutes = Math.max(0, Math.round((new Date(trade.exitAt).getTime() - new Date(trade.entryAt).getTime()) / 60_000));
  return {
    grossPnl: gross.toDecimalPlaces(10).toString(),
    netPnl: net.toDecimalPlaces(10).toString(),
    pnlCny: pnlCny.toDecimalPlaces(10).toString(),
    rMultiple: risk?.greaterThan(0) ? net.div(risk).toDecimalPlaces(10).toString() : null,
    holdMinutes,
    isWinning: net.greaterThan(0),
  };
}

function imageDimensions(buffer, extension) {
  if (extension === "png" && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if ((extension === "jpg" || extension === "jpeg") && buffer.length > 4) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return { width: null, height: null };
}

export async function parseTradingWorkbook(filePath) {
  const absolutePath = resolve(filePath);
  const source = await readFile(absolutePath);
  const sourceHash = createHash("sha256").update(source).digest("hex");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(source);
  const sheet = workbook.getWorksheet(TRADE_SHEET);
  if (!sheet) throw new Error(`工作簿缺少“${TRADE_SHEET}”工作表`);

  const expectedHeaders = ["日期", "交易编号", "标的", "市场", "方向", "策略类型", "周期", "开仓时间", "平仓时间"];
  const actualHeaders = expectedHeaders.map((_, index) => textValue(sheet.getCell(3, index + 1)));
  const warnings = [];
  if (actualHeaders.some((header, index) => header !== expectedHeaders[index])) {
    warnings.push(`表头与预期不一致：${actualHeaders.join("、")}`);
  }

  const dictionary = workbook.getWorksheet("字典与说明");
  const configuredRate = dictionary ? numberValue(dictionary.getCell("H25")) : null;
  const defaultUsdtCnyRate = configuredRate ?? "7.2";
  const trades = [];
  const summaries = new Map();
  const carried = { tradeDate: "", instrumentCode: "", symbol: "" };

  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const meaningful = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 18, 19, 25, 26, 27, 28, 29, 30]
      .some((column) => textValue(row.getCell(column)).length > 0);
    if (!meaningful) continue;

    const explicitDate = cellValue(row.getCell(1));
    const explicitCode = textValue(row.getCell(2));
    const explicitSymbol = textValue(row.getCell(3));
    if (explicitDate instanceof Date) carried.tradeDate = localDate(explicitDate);
    if (explicitCode) carried.instrumentCode = explicitCode;
    if (explicitSymbol) carried.symbol = explicitSymbol;

    const marketText = textValue(row.getCell(4));
    const sideText = textValue(row.getCell(5));
    const market = marketText === "A股" ? "a_share" : marketText === "加密" ? "crypto" : null;
    const side = sideText === "做空" ? "short" : sideText === "做多" ? "long" : null;
    const entryAt = timestampValue(row.getCell(8));
    const exitAt = timestampValue(row.getCell(9));
    const entryPrice = numberValue(row.getCell(13));
    const exitPrice = numberValue(row.getCell(14));
    const positionSize = numberValue(row.getCell(15));
    if (!carried.tradeDate || !carried.symbol || !market || !side || !entryAt || !entryPrice || !positionSize) {
      warnings.push(`第 ${rowNumber} 行缺少必要字段，已跳过`);
      continue;
    }

    const explicitBasis = textValue(row.getCell(16));
    const explicitCurrency = textValue(row.getCell(17));
    const positionBasis = explicitBasis === "数量" ? "quantity" : explicitBasis === "金额" ? "notional" : market === "a_share" ? "quantity" : "notional";
    const settlementCurrency = ["CNY", "USDT", "USD"].includes(explicitCurrency)
      ? explicitCurrency
      : market === "a_share" ? "CNY" : "USDT";
    const errorNotes = textValue(row.getCell(27));
    const status = exitAt && exitPrice ? "closed" : "open";
    const trade = {
      sourceRow: rowNumber,
      status,
      tradeDate: carried.tradeDate,
      instrumentCode: carried.instrumentCode || null,
      symbol: carried.symbol,
      market,
      side,
      strategy: textValue(row.getCell(6)) || "其他",
      timeframe: textValue(row.getCell(7)) || "未记录",
      entryAt,
      exitAt: status === "closed" ? exitAt : null,
      entryReason: textValue(row.getCell(11)) || "Excel 迁移：未填写入场理由",
      exitReason: status === "closed" ? textValue(row.getCell(12)) || null : null,
      entryPrice,
      exitPrice: status === "closed" ? exitPrice : null,
      positionSize,
      positionBasis,
      settlementCurrency,
      plannedRiskAmount: numberValue(row.getCell(18)),
      fees: numberValue(row.getCell(19)) ?? "0",
      fxToCny: settlementCurrency === "CNY" ? "1" : defaultUsdtCnyRate,
      executionGrade: ["A", "B", "C"].includes(textValue(row.getCell(25))) ? textValue(row.getCell(25)) : null,
      emotion: textValue(row.getCell(26)) || null,
      errorTags: inferErrorTags(errorNotes),
      errorNotes: errorNotes || null,
      didWell: textValue(row.getCell(28)) || null,
      nextImprovement: textValue(row.getCell(29)) || null,
    };
    Object.assign(trade, calculateImportedTrade(trade));
    trades.push(trade);

    const summary = textValue(row.getCell(30));
    if (summary) {
      const values = summaries.get(trade.tradeDate) ?? [];
      if (!values.includes(summary)) values.push(summary);
      summaries.set(trade.tradeDate, values);
    }
  }

  const tradeRows = new Set(trades.map((trade) => trade.sourceRow));
  const tradeByRow = new Map(trades.map((trade) => [trade.sourceRow, trade]));
  const attachments = [];
  for (const [sortOrder, image] of sheet.getImages().entries()) {
    const sourceRow = image.range.tl.nativeRow + 1;
    const media = workbook.model.media?.[image.imageId];
    if (!tradeRows.has(sourceRow)) {
      warnings.push(`图片 ${image.imageId} 的左上角位于第 ${sourceRow} 行，未找到对应交易`);
      continue;
    }
    if (!media?.buffer) {
      warnings.push(`图片 ${image.imageId} 缺少二进制内容`);
      continue;
    }
    const extension = (media.extension || "png").toLowerCase();
    const buffer = Buffer.from(media.buffer);
    const dimensions = imageDimensions(buffer, extension);
    attachments.push({
      sourceRow,
      sortOrder,
      extension,
      contentType: extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "webp" ? "image/webp" : "image/png",
      fileName: `${tradeByRow.get(sourceRow)?.symbol || "trade"}-row-${sourceRow}-${sortOrder + 1}.${extension}`,
      buffer,
      ...dimensions,
    });
  }

  const dailyReviews = [...summaries.entries()].map(([reviewDate, values]) => ({
    reviewDate,
    dailySummary: values.join("\n\n"),
  }));
  const report = {
    mode: "dry-run",
    sourceName: basename(absolutePath),
    sourceHash,
    trades: trades.length,
    dates: [...new Set(trades.map((trade) => trade.tradeDate))].sort(),
    dailyReviews: dailyReviews.length,
    attachments: attachments.length,
    warnings,
  };
  return { absolutePath, sourceHash, defaultUsdtCnyRate, trades, dailyReviews, attachments, report };
}

async function saveImport(parsed) {
  const databaseUrl = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const blobToken = process.env.NUXT_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
  if (!databaseUrl) throw new Error("缺少 NUXT_DATABASE_URL 或 DATABASE_URL");
  if (!blobToken) throw new Error("缺少 NUXT_BLOB_READ_WRITE_TOKEN 或 BLOB_READ_WRITE_TOKEN");
  const sql = neon(databaseUrl);
  const existing = await sql.query("SELECT status FROM import_batches WHERE source_hash = $1 LIMIT 1", [parsed.sourceHash]);
  if (existing[0]?.status === "completed") {
    return { ...parsed.report, mode: "apply", skipped: true, message: "该文件已成功导入，未创建重复数据" };
  }

  await sql.query(
    `INSERT INTO import_batches (source_hash, source_name, status, warnings)
     VALUES ($1, $2, 'running', $3::jsonb)
     ON CONFLICT (source_hash) DO UPDATE SET status = 'running', warnings = EXCLUDED.warnings, completed_at = NULL`,
    [parsed.sourceHash, parsed.report.sourceName, JSON.stringify(parsed.report.warnings)],
  );

  try {
    const tradeIds = new Map();
    for (const trade of parsed.trades) {
      const rows = await sql.query(
        `INSERT INTO trades (
          status, trade_date, instrument_code, symbol, market, side, strategy, timeframe,
          entry_at, exit_at, entry_reason, exit_reason, entry_price, exit_price, position_size,
          position_basis, settlement_currency, planned_risk_amount, fees, fx_to_cny,
          gross_pnl, net_pnl, pnl_cny, r_multiple, hold_minutes, is_winning,
          execution_grade, emotion, error_notes, did_well, next_improvement, source_file_hash, source_row
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
        )
        ON CONFLICT (source_file_hash, source_row)
        DO UPDATE SET source_file_hash = EXCLUDED.source_file_hash
        RETURNING id`,
        [
          trade.status, trade.tradeDate, trade.instrumentCode, trade.symbol, trade.market, trade.side,
          trade.strategy, trade.timeframe, trade.entryAt, trade.exitAt, trade.entryReason, trade.exitReason,
          trade.entryPrice, trade.exitPrice, trade.positionSize, trade.positionBasis, trade.settlementCurrency,
          trade.plannedRiskAmount, trade.fees, trade.fxToCny, trade.grossPnl, trade.netPnl, trade.pnlCny,
          trade.rMultiple, trade.holdMinutes, trade.isWinning, trade.executionGrade, trade.emotion,
          trade.errorNotes, trade.didWell, trade.nextImprovement, parsed.sourceHash, trade.sourceRow,
        ],
      );
      const tradeId = rows[0].id;
      tradeIds.set(trade.sourceRow, tradeId);
      for (const [sortOrder, label] of trade.errorTags.entries()) {
        const optionRows = await sql.query(
          `INSERT INTO trading_options (kind, label, sort_order)
           VALUES ('error_tag', $1, $2)
           ON CONFLICT (kind, label) DO UPDATE SET active = true
           RETURNING id`,
          [label, sortOrder],
        );
        await sql.query(
          `INSERT INTO trade_error_tags (trade_id, option_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [tradeId, optionRows[0].id],
        );
      }
    }

    for (const attachment of parsed.attachments) {
      const tradeId = tradeIds.get(attachment.sourceRow);
      if (!tradeId) continue;
      const pathname = `trading/imports/${parsed.sourceHash}/row-${attachment.sourceRow}/image-${attachment.sortOrder + 1}.${attachment.extension}`;
      const blob = await put(pathname, attachment.buffer, {
        access: "private",
        token: blobToken,
        contentType: attachment.contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      await sql.query(
        `INSERT INTO trade_attachments (
          trade_id, pathname, blob_url, file_name, content_type, size, width, height, sort_order, is_cover
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (pathname) DO UPDATE SET
          blob_url = EXCLUDED.blob_url, size = EXCLUDED.size, width = EXCLUDED.width, height = EXCLUDED.height`,
        [
          tradeId, blob.pathname, blob.url, attachment.fileName, attachment.contentType,
          attachment.buffer.length, attachment.width, attachment.height, attachment.sortOrder,
          !parsed.attachments.some((item) => item.sourceRow === attachment.sourceRow && item.sortOrder < attachment.sortOrder),
        ],
      );
    }

    for (const review of parsed.dailyReviews) {
      await sql.query(
        `INSERT INTO daily_reviews (review_date, daily_summary)
         VALUES ($1, $2)
         ON CONFLICT (review_date) DO UPDATE SET
           daily_summary = CASE
             WHEN daily_reviews.daily_summary IS NULL OR daily_reviews.daily_summary = '' THEN EXCLUDED.daily_summary
             ELSE daily_reviews.daily_summary
           END`,
        [review.reviewDate, review.dailySummary],
      );
    }

    await sql.query(
      `UPDATE import_batches
       SET status = 'completed', row_count = $2, attachment_count = $3, completed_at = now()
       WHERE source_hash = $1`,
      [parsed.sourceHash, parsed.trades.length, parsed.attachments.length],
    );
    return { ...parsed.report, mode: "apply", skipped: false };
  } catch (error) {
    await sql.query(
      `UPDATE import_batches SET status = 'failed', warnings = warnings || $2::jsonb WHERE source_hash = $1`,
      [parsed.sourceHash, JSON.stringify([error instanceof Error ? error.message : String(error)])],
    ).catch(() => undefined);
    throw error;
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const filePath = argumentValue("--file") || DEFAULT_WORKBOOK;
  const apply = process.argv.includes("--apply");
  const parsed = await parseTradingWorkbook(filePath);
  const result = apply ? await saveImport(parsed) : parsed.report;
  console.log(JSON.stringify(result, null, 2));
  if (!apply) {
    console.log("\nDry-run 完成。确认报告后，配置数据库和 Blob 环境变量并执行：pnpm trading:import -- --apply");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

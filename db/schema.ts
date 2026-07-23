import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: varchar("status", { length: 16 }).notNull(),
  tradeDate: date("trade_date").notNull(),
  instrumentCode: varchar("instrument_code", { length: 80 }),
  symbol: varchar("symbol", { length: 160 }).notNull(),
  market: varchar("market", { length: 24 }).notNull(),
  side: varchar("side", { length: 16 }).notNull(),
  strategy: varchar("strategy", { length: 120 }).notNull(),
  timeframe: varchar("timeframe", { length: 40 }).notNull(),
  entryAt: timestamp("entry_at", { withTimezone: true }).notNull(),
  exitAt: timestamp("exit_at", { withTimezone: true }),
  entryReason: text("entry_reason").notNull(),
  exitReason: text("exit_reason"),
  entryPrice: numeric("entry_price", { precision: 30, scale: 10 }).notNull(),
  exitPrice: numeric("exit_price", { precision: 30, scale: 10 }),
  positionSize: numeric("position_size", { precision: 30, scale: 10 }).notNull(),
  positionBasis: varchar("position_basis", { length: 16 }).notNull(),
  settlementCurrency: varchar("settlement_currency", { length: 12 }).notNull(),
  plannedRiskAmount: numeric("planned_risk_amount", { precision: 30, scale: 10 }),
  fees: numeric("fees", { precision: 30, scale: 10 }).notNull().default("0"),
  fxToCny: numeric("fx_to_cny", { precision: 30, scale: 10 }).notNull(),
  grossPnl: numeric("gross_pnl", { precision: 30, scale: 10 }),
  netPnl: numeric("net_pnl", { precision: 30, scale: 10 }),
  pnlCny: numeric("pnl_cny", { precision: 30, scale: 10 }),
  rMultiple: numeric("r_multiple", { precision: 30, scale: 10 }),
  holdMinutes: integer("hold_minutes"),
  isWinning: boolean("is_winning"),
  executionGrade: varchar("execution_grade", { length: 4 }),
  emotion: varchar("emotion", { length: 80 }),
  errorNotes: text("error_notes"),
  didWell: text("did_well"),
  nextImprovement: text("next_improvement"),
  sourceFileHash: varchar("source_file_hash", { length: 64 }),
  sourceRow: integer("source_row"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  ...timestamps,
}, (table) => [
  index("trades_trade_date_idx").on(table.tradeDate),
  index("trades_market_idx").on(table.market),
  index("trades_status_idx").on(table.status),
  uniqueIndex("trades_source_row_uidx").on(table.sourceFileHash, table.sourceRow),
]);

export const dailyReviews = pgTable("daily_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewDate: date("review_date").notNull(),
  marketPlan: text("market_plan"),
  dailySummary: text("daily_summary"),
  bestTradeId: uuid("best_trade_id").references(() => trades.id, { onDelete: "set null" }),
  biggestMistake: text("biggest_mistake"),
  tomorrowOneThing: text("tomorrow_one_thing"),
  plannedOnly: boolean("planned_only"),
  followedStops: boolean("followed_stops"),
  avoidedImpulseAdds: boolean("avoided_impulse_adds"),
  avoidedRevengeTrading: boolean("avoided_revenge_trading"),
  exitedAsPlanned: boolean("exited_as_planned"),
  priorityFix: text("priority_fix"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  ...timestamps,
}, (table) => [
  uniqueIndex("daily_reviews_date_uidx").on(table.reviewDate),
]);

export const tradingOptions = pgTable("trading_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: varchar("kind", { length: 24 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("trading_options_kind_label_uidx").on(table.kind, table.label),
]);

export const tradeErrorTags = pgTable("trade_error_tags", {
  tradeId: uuid("trade_id").notNull().references(() => trades.id, { onDelete: "cascade" }),
  optionId: uuid("option_id").notNull().references(() => tradingOptions.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.tradeId, table.optionId] }),
]);

export const tradeAttachments = pgTable("trade_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradeId: uuid("trade_id").notNull().references(() => trades.id, { onDelete: "cascade" }),
  pathname: text("pathname").notNull(),
  blobUrl: text("blob_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 80 }).notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  sortOrder: integer("sort_order").notNull().default(0),
  isCover: boolean("is_cover").notNull().default(false),
  ...timestamps,
}, (table) => [
  index("trade_attachments_trade_idx").on(table.tradeId, table.sortOrder),
  uniqueIndex("trade_attachments_path_uidx").on(table.pathname),
]);

export const tradingSettings = pgTable("trading_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceHash: varchar("source_hash", { length: 64 }).notNull(),
  sourceName: varchar("source_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  rowCount: integer("row_count").notNull().default(0),
  attachmentCount: integer("attachment_count").notNull().default(0),
  warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("import_batches_source_uidx").on(table.sourceHash),
]);

CREATE TABLE "daily_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_date" date NOT NULL,
	"market_plan" text,
	"daily_summary" text,
	"best_trade_id" uuid,
	"biggest_mistake" text,
	"tomorrow_one_thing" text,
	"planned_only" boolean,
	"followed_stops" boolean,
	"avoided_impulse_adds" boolean,
	"avoided_revenge_trading" boolean,
	"exited_as_planned" boolean,
	"priority_fix" text,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"source_name" varchar(255) NOT NULL,
	"status" varchar(24) NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"attachment_count" integer DEFAULT 0 NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trade_id" uuid NOT NULL,
	"pathname" text NOT NULL,
	"blob_url" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"content_type" varchar(80) NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_error_tags" (
	"trade_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	CONSTRAINT "trade_error_tags_trade_id_option_id_pk" PRIMARY KEY("trade_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(16) NOT NULL,
	"trade_date" date NOT NULL,
	"instrument_code" varchar(80),
	"symbol" varchar(160) NOT NULL,
	"market" varchar(24) NOT NULL,
	"side" varchar(16) NOT NULL,
	"strategy" varchar(120) NOT NULL,
	"timeframe" varchar(40) NOT NULL,
	"entry_at" timestamp with time zone NOT NULL,
	"exit_at" timestamp with time zone,
	"entry_reason" text NOT NULL,
	"exit_reason" text,
	"entry_price" numeric(30, 10) NOT NULL,
	"exit_price" numeric(30, 10),
	"position_size" numeric(30, 10) NOT NULL,
	"position_basis" varchar(16) NOT NULL,
	"settlement_currency" varchar(12) NOT NULL,
	"planned_risk_amount" numeric(30, 10),
	"fees" numeric(30, 10) DEFAULT '0' NOT NULL,
	"fx_to_cny" numeric(30, 10) NOT NULL,
	"gross_pnl" numeric(30, 10),
	"net_pnl" numeric(30, 10),
	"pnl_cny" numeric(30, 10),
	"r_multiple" numeric(30, 10),
	"hold_minutes" integer,
	"is_winning" boolean,
	"execution_grade" varchar(4),
	"emotion" varchar(80),
	"did_well" text,
	"next_improvement" text,
	"source_file_hash" varchar(64),
	"source_row" integer,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(24) NOT NULL,
	"label" varchar(120) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_reviews" ADD CONSTRAINT "daily_reviews_best_trade_id_trades_id_fk" FOREIGN KEY ("best_trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_attachments" ADD CONSTRAINT "trade_attachments_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_error_tags" ADD CONSTRAINT "trade_error_tags_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_error_tags" ADD CONSTRAINT "trade_error_tags_option_id_trading_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."trading_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reviews_date_uidx" ON "daily_reviews" USING btree ("review_date");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_source_uidx" ON "import_batches" USING btree ("source_hash");--> statement-breakpoint
CREATE INDEX "trade_attachments_trade_idx" ON "trade_attachments" USING btree ("trade_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_attachments_path_uidx" ON "trade_attachments" USING btree ("pathname");--> statement-breakpoint
CREATE INDEX "trades_trade_date_idx" ON "trades" USING btree ("trade_date");--> statement-breakpoint
CREATE INDEX "trades_market_idx" ON "trades" USING btree ("market");--> statement-breakpoint
CREATE INDEX "trades_status_idx" ON "trades" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "trades_source_row_uidx" ON "trades" USING btree ("source_file_hash","source_row");--> statement-breakpoint
CREATE UNIQUE INDEX "trading_options_kind_label_uidx" ON "trading_options" USING btree ("kind","label");--> statement-breakpoint
INSERT INTO "trading_options" ("kind", "label", "sort_order") VALUES
	('strategy', '趋势突破', 10),
	('strategy', '回调低吸', 20),
	('strategy', '区间反转', 30),
	('strategy', '情绪龙头', 40),
	('strategy', '其他', 90),
	('timeframe', '1分', 10),
	('timeframe', '5分', 20),
	('timeframe', '15分', 30),
	('timeframe', '1小时', 40),
	('timeframe', '日线', 50),
	('emotion', '平静', 10),
	('emotion', '自信', 20),
	('emotion', '犹豫', 30),
	('emotion', '急躁', 40),
	('emotion', '恐惧', 50),
	('emotion', '报复性', 60),
	('error_tag', '追涨杀跌', 10),
	('error_tag', '计划外交易', 20),
	('error_tag', '止损犹豫', 30),
	('error_tag', '过早止盈', 40),
	('error_tag', '冲动加仓', 50),
	('error_tag', '报复性交易', 60),
	('error_tag', '仓位过重', 70),
	('error_tag', '逆势交易', 80),
	('error_tag', '未按计划离场', 90);--> statement-breakpoint
INSERT INTO "trading_settings" ("key", "value")
VALUES ('default_usdt_cny_rate', '7.2');

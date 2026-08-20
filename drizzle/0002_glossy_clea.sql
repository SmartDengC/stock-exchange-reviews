CREATE TABLE "research_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(8) NOT NULL,
	"slug" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"date_label" varchar(80) NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "research_reviews_kind_slug_uidx" ON "research_reviews" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "research_reviews_kind_date_idx" ON "research_reviews" USING btree ("kind","date_label");
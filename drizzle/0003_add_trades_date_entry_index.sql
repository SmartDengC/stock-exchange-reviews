-- Composite index for optimizing trade list queries sorted by date and entry time
CREATE INDEX "trades_date_entry_idx" ON "trades" USING btree ("trade_date" DESC, "entry_at" DESC);

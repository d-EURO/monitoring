-- Track when the suspicious-liq-price watcher last fired for a position so we
-- don't re-alert every cycle.
ALTER TABLE "position_states"
  ADD COLUMN "suspicious_liq_price_alerted_at" BIGINT;

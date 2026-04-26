-- Track when alerts were sent to avoid re-sending every cycle
ALTER TABLE "position_states"
  ADD COLUMN "mini_lifetime_alerted_at" BIGINT,
  ADD COLUMN "phase2_alerted_at"        BIGINT;

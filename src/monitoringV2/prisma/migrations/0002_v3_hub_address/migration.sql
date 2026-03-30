-- V3 migration: add hub_address to challenge_states for multi-hub support
-- Idempotent: safe to run on databases with or without the column

-- Add hub_address column
ALTER TABLE "public"."challenge_states" ADD COLUMN IF NOT EXISTS "hub_address" VARCHAR(42);

-- Backfill existing challenges with V2 MintingHub address
UPDATE "public"."challenge_states"
SET "hub_address" = '0x8b3c41c649b9c7085c171cbb82337889b3604618'
WHERE "hub_address" IS NULL;

-- Make column NOT NULL after backfill
ALTER TABLE "public"."challenge_states" ALTER COLUMN "hub_address" SET NOT NULL;

-- Change PK from (challenge_id) to (challenge_id, hub_address)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'challenge_states_pkey'
        AND conrelid = 'challenge_states'::regclass
        AND array_length(conkey, 1) = 1
    ) THEN
        ALTER TABLE "public"."challenge_states" DROP CONSTRAINT "challenge_states_pkey";
        ALTER TABLE "public"."challenge_states" ADD PRIMARY KEY ("challenge_id", "hub_address");
    END IF;
END $$;

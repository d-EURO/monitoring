-- Migration: Add market price and collateralization ratio fields to position_states
-- Date: 2025-01-11

-- Add market_price column if it doesn't exist
ALTER TABLE position_states 
ADD COLUMN IF NOT EXISTS market_price NUMERIC(78, 0);

-- Add collateralization_ratio column if it doesn't exist
ALTER TABLE position_states 
ADD COLUMN IF NOT EXISTS collateralization_ratio NUMERIC(10, 4);

-- Add comment for documentation
COMMENT ON COLUMN position_states.market_price IS 'Current market price of the collateral token from external price API';
COMMENT ON COLUMN position_states.collateralization_ratio IS 'Ratio of market price to virtual price (market_price / virtual_price)';
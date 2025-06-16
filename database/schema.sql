-- dEURO Monitoring Database Schema
-- This schema supports comprehensive event monitoring and state tracking for the dEURO protocol

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- MONITORING INFRASTRUCTURE TABLES
-- =============================================================================

-- Monitoring cycle metadata tracking
CREATE TABLE IF NOT EXISTS monitoring_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_processed_block BIGINT NOT NULL,
    events_processed INTEGER DEFAULT 0,
    processing_duration_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_monitoring_metadata_cycle_timestamp ON monitoring_metadata (cycle_timestamp DESC);

-- =============================================================================
-- EVENT TABLES
-- =============================================================================

-- dEURO Transfer Events
CREATE TABLE IF NOT EXISTS deuro_transfer_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value NUMERIC(78, 0) NOT NULL, -- Support for large BigInt values
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- DEPS Transfer Events
CREATE TABLE IF NOT EXISTS deps_transfer_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- dEURO Minter Applied Events
CREATE TABLE IF NOT EXISTS deuro_minter_applied_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    minter VARCHAR(42) NOT NULL,
    application_period NUMERIC(78, 0) NOT NULL,
    application_fee NUMERIC(78, 0) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- dEURO Minter Denied Events
CREATE TABLE IF NOT EXISTS deuro_minter_denied_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    minter VARCHAR(42) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- dEURO Loss Events
CREATE TABLE IF NOT EXISTS deuro_loss_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    reporting_minter VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- dEURO Profit Events
CREATE TABLE IF NOT EXISTS deuro_profit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    reporting_minter VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- dEURO Profit Distributed Events
CREATE TABLE IF NOT EXISTS deuro_profit_distributed_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    recipient VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Equity Trade Events
CREATE TABLE IF NOT EXISTS equity_trade_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    who VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    tot_price NUMERIC(78, 0) NOT NULL,
    new_price NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Equity Delegation Events
CREATE TABLE IF NOT EXISTS equity_delegation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- DEPS Wrap Events
CREATE TABLE IF NOT EXISTS deps_wrap_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value NUMERIC(78, 0) NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- DEPS Unwrap Events
CREATE TABLE IF NOT EXISTS deps_unwrap_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value NUMERIC(78, 0) NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Savings Saved Events
CREATE TABLE IF NOT EXISTS savings_saved_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    account VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Savings Interest Collected Events
CREATE TABLE IF NOT EXISTS savings_interest_collected_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    account VARCHAR(42) NOT NULL,
    interest NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Savings Withdrawn Events
CREATE TABLE IF NOT EXISTS savings_withdrawn_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    account VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Savings Rate Proposed Events
CREATE TABLE IF NOT EXISTS savings_rate_proposed_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    who VARCHAR(42) NOT NULL,
    next_rate NUMERIC(78, 0) NOT NULL,
    next_change NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Savings Rate Changed Events
CREATE TABLE IF NOT EXISTS savings_rate_changed_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    new_rate NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Minting Hub Position Opened Events
CREATE TABLE IF NOT EXISTS minting_hub_position_opened_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    owner VARCHAR(42) NOT NULL,
    position VARCHAR(42) NOT NULL,
    original VARCHAR(42) NOT NULL,
    collateral VARCHAR(42) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Roller Roll Events
CREATE TABLE IF NOT EXISTS roller_roll_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    source VARCHAR(42) NOT NULL,
    coll_withdraw NUMERIC(78, 0) NOT NULL,
    repay NUMERIC(78, 0) NOT NULL,
    target VARCHAR(42) NOT NULL,
    coll_deposit NUMERIC(78, 0) NOT NULL,
    mint NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- Position Denied Events
CREATE TABLE IF NOT EXISTS position_denied_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    position VARCHAR(42) NOT NULL,
    sender VARCHAR(42) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tx_hash, log_index)
);

-- =============================================================================
-- STATE TABLES
-- =============================================================================

-- dEURO Contract States
CREATE TABLE IF NOT EXISTS deuro_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_supply NUMERIC(78, 0) NOT NULL,
    minter_reserve NUMERIC(78, 0) NOT NULL,
    equity NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number)
);

-- Equity Contract States
CREATE TABLE IF NOT EXISTS equity_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_shares NUMERIC(78, 0) NOT NULL,
    total_votes NUMERIC(78, 0) NOT NULL,
    market_cap NUMERIC(78, 0) NOT NULL,
    price NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number)
);

-- DEPS Wrapper States
CREATE TABLE IF NOT EXISTS deps_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_wrapped NUMERIC(78, 0) NOT NULL,
    wrapper_balance NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number)
);

-- Savings Gateway States
CREATE TABLE IF NOT EXISTS savings_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_savings NUMERIC(78, 0) NOT NULL,
    current_rate NUMERIC(78, 0) NOT NULL,
    savings_cap NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number)
);

-- Frontend Gateway States
CREATE TABLE IF NOT EXISTS frontend_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_fees_collected NUMERIC(78, 0) NOT NULL,
    active_frontends INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number)
);

-- Minting Hub States
CREATE TABLE IF NOT EXISTS minting_hub_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_positions INTEGER NOT NULL,
    total_collateral NUMERIC(78, 0) NOT NULL,
    total_minted NUMERIC(78, 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number)
);

-- Individual Position States
CREATE TABLE IF NOT EXISTS position_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    position_address VARCHAR(42) NOT NULL,
    owner_address VARCHAR(42) NOT NULL,
    collateral_address VARCHAR(42) NOT NULL,
    collateral_balance NUMERIC(78, 0) NOT NULL,
    minted_amount NUMERIC(78, 0) NOT NULL,
    limit_for_position NUMERIC(78, 0) NOT NULL,
    limit_for_clones NUMERIC(78, 0) NOT NULL,
    available_for_position NUMERIC(78, 0) NOT NULL,
    available_for_clones NUMERIC(78, 0) NOT NULL,
    is_original BOOLEAN NOT NULL,
    is_clone BOOLEAN NOT NULL,
    is_closed BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number, position_address)
);

-- Challenge States
CREATE TABLE IF NOT EXISTS challenge_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    challenge_number BIGINT NOT NULL,
    position_address VARCHAR(42) NOT NULL,
    challenger_address VARCHAR(42) NOT NULL,
    bid_amount NUMERIC(78, 0) NOT NULL,
    challenge_size NUMERIC(78, 0) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number, challenge_number)
);

-- Collateral Token States
CREATE TABLE IF NOT EXISTS collateral_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    decimals INTEGER NOT NULL,
    total_collateral NUMERIC(78, 0) NOT NULL,
    position_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number, token_address)
);

-- Cross-chain Bridge States
CREATE TABLE IF NOT EXISTS bridge_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    bridge_address VARCHAR(42) NOT NULL,
    target_chain_id INTEGER NOT NULL,
    total_bridged NUMERIC(78, 0) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(block_number, bridge_address)
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Event table indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deuro_transfer_events_timestamp ON deuro_transfer_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deuro_transfer_events_from ON deuro_transfer_events (from_address);
CREATE INDEX IF NOT EXISTS idx_deuro_transfer_events_to ON deuro_transfer_events (to_address);

CREATE INDEX IF NOT EXISTS idx_deps_transfer_events_timestamp ON deps_transfer_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deps_transfer_events_from ON deps_transfer_events (from_address);
CREATE INDEX IF NOT EXISTS idx_deps_transfer_events_to ON deps_transfer_events (to_address);

CREATE INDEX IF NOT EXISTS idx_deuro_minter_applied_events_timestamp ON deuro_minter_applied_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deuro_minter_applied_events_minter ON deuro_minter_applied_events (minter);

CREATE INDEX IF NOT EXISTS idx_deuro_minter_denied_events_timestamp ON deuro_minter_denied_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deuro_minter_denied_events_minter ON deuro_minter_denied_events (minter);

CREATE INDEX IF NOT EXISTS idx_equity_trade_events_timestamp ON equity_trade_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_equity_trade_events_who ON equity_trade_events (who);

CREATE INDEX IF NOT EXISTS idx_savings_saved_events_timestamp ON savings_saved_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_savings_saved_events_account ON savings_saved_events (account);

CREATE INDEX IF NOT EXISTS idx_savings_withdrawn_events_timestamp ON savings_withdrawn_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_savings_withdrawn_events_account ON savings_withdrawn_events (account);

CREATE INDEX IF NOT EXISTS idx_minting_hub_position_opened_events_timestamp ON minting_hub_position_opened_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_minting_hub_position_opened_events_owner ON minting_hub_position_opened_events (owner);
CREATE INDEX IF NOT EXISTS idx_minting_hub_position_opened_events_position ON minting_hub_position_opened_events (position);

CREATE INDEX IF NOT EXISTS idx_position_denied_events_timestamp ON position_denied_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_position_denied_events_position ON position_denied_events (position);
CREATE INDEX IF NOT EXISTS idx_position_denied_events_sender ON position_denied_events (sender);

-- State table indexes
CREATE INDEX IF NOT EXISTS idx_deuro_states_block_number ON deuro_states (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_deuro_states_timestamp ON deuro_states (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_equity_states_block_number ON equity_states (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_equity_states_timestamp ON equity_states (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_position_states_block_number ON position_states (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_position_states_position_address ON position_states (position_address);
CREATE INDEX IF NOT EXISTS idx_position_states_owner ON position_states (owner_address);
CREATE INDEX IF NOT EXISTS idx_position_states_is_closed ON position_states (is_closed);

CREATE INDEX IF NOT EXISTS idx_challenge_states_block_number ON challenge_states (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_states_position ON challenge_states (position_address);
CREATE INDEX IF NOT EXISTS idx_challenge_states_is_active ON challenge_states (is_active);

-- =============================================================================
-- INITIAL DATA (Optional)
-- =============================================================================

-- Insert initial monitoring metadata record if none exists
INSERT INTO monitoring_metadata (last_processed_block, events_processed, processing_duration_ms)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM monitoring_metadata);

-- =============================================================================
-- COMMENTS FOR MAINTENANCE
-- =============================================================================

COMMENT ON TABLE monitoring_metadata IS 'Tracks monitoring cycle execution and blockchain synchronization state';
COMMENT ON TABLE deuro_transfer_events IS 'dEURO token transfer events from the blockchain';
COMMENT ON TABLE position_states IS 'Snapshots of individual position states at specific block heights';
COMMENT ON TABLE challenge_states IS 'Challenge events and their current status in the protocol';

-- Schema version for future migrations
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_version (version, description) 
VALUES (1, 'Initial dEURO monitoring schema with comprehensive event and state tracking')
ON CONFLICT (version) DO NOTHING;
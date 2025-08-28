-- All events (raw)
CREATE TABLE IF NOT EXISTS raw_events (
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,  -- ALL decoded event parameters
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_block ON raw_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON raw_events(event_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_contract ON raw_events(contract_address, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_data ON raw_events USING GIN(event_data);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON raw_events(timestamp DESC);

-- Dynamic Contract Registry (auto-populated from events)
CREATE TABLE IF NOT EXISTS contracts (
    address VARCHAR(42) PRIMARY KEY,
    contract_type VARCHAR(50) NOT NULL, -- e.g. DEURO, EQUITY, POSITION, MINTER, BRIDGE
    created_at_block BIGINT NOT NULL,
    metadata JSONB, -- flexible storage for contract-specific data
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_active ON contracts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contracts_metadata ON contracts USING GIN(metadata);

-- Processing State
CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_processed_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Position States
CREATE TABLE IF NOT EXISTS position_states (
    position_address VARCHAR(42) PRIMARY KEY,
    status VARCHAR(20) NOT NULL, -- ACTIVE, CHALLENGED, EXPIRED, CLOSED
    owner_address VARCHAR(42) NOT NULL,
    original_address VARCHAR(42) NOT NULL,
    collateral_address VARCHAR(42) NOT NULL,
    collateral_balance NUMERIC(78, 0) NOT NULL,
    price NUMERIC(78, 0) NOT NULL,
    virtual_price NUMERIC(78, 0) NOT NULL,
    expired_purchase_price NUMERIC(78, 0) NOT NULL,
    collateral_requirement NUMERIC(78, 0) NOT NULL,
    debt NUMERIC(78, 0) NOT NULL,
    interest NUMERIC(78, 0) NOT NULL,
    minimum_collateral NUMERIC(78, 0) NOT NULL,
    minimum_challenge_amount NUMERIC(78, 0) NOT NULL,
    limit_amount NUMERIC(78, 0) NOT NULL,
    principal NUMERIC(78, 0) NOT NULL,
    risk_premium_ppm INTEGER NOT NULL,
    reserve_contribution INTEGER NOT NULL,
    fixed_annual_rate_ppm INTEGER NOT NULL,
    last_accrual NUMERIC(78, 0) NOT NULL,
    start_timestamp NUMERIC(78, 0) NOT NULL,
    cooldown_period NUMERIC(78, 0) NOT NULL,
    expiration_timestamp NUMERIC(78, 0) NOT NULL,
    challenged_amount NUMERIC(78, 0) NOT NULL,
    challenge_period NUMERIC(78, 0) NOT NULL,
    is_closed BOOLEAN NOT NULL,
    available_for_minting NUMERIC(78, 0) NOT NULL,
    available_for_clones NUMERIC(78, 0) NOT NULL,
    created INTEGER,
    market_price NUMERIC(78, 0),
    collateralization_ratio NUMERIC(10, 4),
    frontend_code VARCHAR(66),
    
    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_position_states_owner ON position_states(owner_address);
CREATE INDEX IF NOT EXISTS idx_position_states_status ON position_states(status);
CREATE INDEX IF NOT EXISTS idx_position_states_original ON position_states(original_address);
CREATE INDEX IF NOT EXISTS idx_position_states_collateral ON position_states(collateral_address);
CREATE INDEX IF NOT EXISTS idx_position_states_is_closed ON position_states(is_closed);
CREATE INDEX IF NOT EXISTS idx_position_states_frontend_code ON position_states(frontend_code) WHERE frontend_code IS NOT NULL;

-- Challenge States
CREATE TABLE IF NOT EXISTS challenge_states (
    challenge_id INTEGER PRIMARY KEY,
    challenger_address VARCHAR(42) NOT NULL,
    position_address VARCHAR(42) NOT NULL,
    position_owner_address VARCHAR(42) NOT NULL,
    start_timestamp BIGINT NOT NULL,
    initial_size NUMERIC(78, 0) NOT NULL,
    size NUMERIC(78, 0) NOT NULL,
    collateral_address VARCHAR(42) NOT NULL,
    liq_price NUMERIC(78, 0) NOT NULL,
    phase INTEGER NOT NULL, -- 0: Bid, 1: Avert, 2: Ended
    status VARCHAR(20) NOT NULL, -- ACTIVE, AVERTED, SUCCEEDED
    current_price NUMERIC(78, 0) NOT NULL,
    
    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_challenge_states_position ON challenge_states(position_address);
CREATE INDEX IF NOT EXISTS idx_challenge_states_challenger ON challenge_states(challenger_address);
CREATE INDEX IF NOT EXISTS idx_challenge_states_status ON challenge_states(status);
CREATE INDEX IF NOT EXISTS idx_challenge_states_phase ON challenge_states(phase);

-- Collateral States
CREATE TABLE IF NOT EXISTS collateral_states (
    token_address VARCHAR(42) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    decimals INTEGER NOT NULL,
    total_collateral NUMERIC(78, 0) NOT NULL,
    position_count INTEGER NOT NULL,
    total_limit NUMERIC(78, 0) NOT NULL DEFAULT 0,
    total_available_for_minting NUMERIC(78, 0) NOT NULL DEFAULT 0,
    price NUMERIC(20, 8) DEFAULT 0, -- EUR market price from CoinGecko
    
    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collateral_states_symbol ON collateral_states(symbol);

-- Minter States
CREATE TABLE IF NOT EXISTS minter_states (
    minter_address VARCHAR(42) PRIMARY KEY,
    minter_type VARCHAR(20) NOT NULL, -- REGULAR, BRIDGE
    status VARCHAR(20) NOT NULL, -- PENDING, APPROVED, DENIED
    application_date TIMESTAMP WITH TIME ZONE,
    application_period NUMERIC(78, 0),
    application_fee NUMERIC(78, 0),
    message TEXT,
    denial_date TIMESTAMP WITH TIME ZONE,
    denial_message TEXT,
    
    -- Bridge-specific fields (NULL for regular minters)
    bridge_token_address VARCHAR(42),
    bridge_token_symbol VARCHAR(10),
    bridge_token_decimals INTEGER,
    bridge_horizon NUMERIC(78, 0),
    bridge_limit NUMERIC(78, 0),
    bridge_minted NUMERIC(78, 0),

    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_minter_states_type ON minter_states(minter_type);
CREATE INDEX IF NOT EXISTS idx_minter_states_status ON minter_states(status);
CREATE INDEX IF NOT EXISTS idx_minter_states_bridge_token ON minter_states(bridge_token_address) WHERE bridge_token_address IS NOT NULL;

-- System State (single row for global metrics)
CREATE TABLE IF NOT EXISTS system_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    -- Token supplies
    deuro_total_supply NUMERIC(78, 0) NOT NULL DEFAULT 0,
    deps_total_supply NUMERIC(78, 0) NOT NULL DEFAULT 0,
    
    -- Equity metrics
    equity_shares NUMERIC(78, 0) NOT NULL DEFAULT 0,
    equity_price NUMERIC(78, 0) NOT NULL DEFAULT 0,
    
    -- Reserve metrics
    reserve_total NUMERIC(78, 0) NOT NULL DEFAULT 0,
    reserve_minter NUMERIC(78, 0) NOT NULL DEFAULT 0,
    reserve_equity NUMERIC(78, 0) NOT NULL DEFAULT 0,
    
    -- Savings metrics
    savings_total NUMERIC(78, 0) NOT NULL DEFAULT 0,
    savings_interest_collected NUMERIC(78, 0) NOT NULL DEFAULT 0,
    savings_rate NUMERIC(78, 0) NOT NULL DEFAULT 0,
    
    -- Profit/Loss tracking
    deuro_loss NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    deuro_profit NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    deuro_profit_distributed NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    
    -- Frontend metrics
    frontend_fees_collected NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    frontends_active INTEGER DEFAULT 0 NOT NULL,
    
    -- Currency rates
    usd_to_eur_rate NUMERIC(10, 6) DEFAULT 0 NOT NULL,
    usd_to_chf_rate NUMERIC(10, 6) DEFAULT 0 NOT NULL,
    
    -- metadata
    block_number BIGINT NOT NULL DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT system_single_row CHECK (id = 1)
);

-- =============================================================================
-- INITIALIZATION
-- =============================================================================

-- Initialize sync state
INSERT INTO sync_state (id, last_processed_block, updated_at) 
VALUES (1, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Initialize system state
INSERT INTO system_state (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
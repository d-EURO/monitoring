-- =============================================================================
-- DEURO MONITORING DATABASE SCHEMA
-- =============================================================================

-- =============================================================================
-- MONITORING INFRASTRUCTURE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS monitoring_metadata (
    cycle_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_processed_block BIGINT NOT NULL,
    events_processed INTEGER DEFAULT 0,
    processing_duration_ms INTEGER DEFAULT 0,
    PRIMARY KEY (cycle_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_monitoring_metadata_cycle_timestamp ON monitoring_metadata (cycle_timestamp DESC);

-- =============================================================================
-- EVENT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS deuro_transfer_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS deps_transfer_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS deuro_minter_applied_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    minter VARCHAR(42) NOT NULL,
    application_period NUMERIC(78, 0) NOT NULL,
    application_fee NUMERIC(78, 0) NOT NULL,
    message TEXT,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS deuro_minter_denied_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    minter VARCHAR(42) NOT NULL,
    message TEXT,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS deuro_loss_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    reporting_minter VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS deuro_profit_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    reporting_minter VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS deuro_profit_distributed_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    recipient VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS equity_trade_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    who VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    tot_price NUMERIC(78, 0) NOT NULL,
    new_price NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS equity_delegation_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS savings_saved_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    account VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS savings_interest_collected_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    account VARCHAR(42) NOT NULL,
    interest NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS savings_withdrawn_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    account VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS savings_rate_proposed_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    who VARCHAR(42) NOT NULL,
    next_rate NUMERIC(78, 0) NOT NULL,
    next_change NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS savings_rate_changed_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    new_rate NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS mintinghub_position_opened_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    owner VARCHAR(42) NOT NULL,
    position VARCHAR(42) NOT NULL,
    original VARCHAR(42) NOT NULL,
    collateral VARCHAR(42) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS mintinghub_challenge_started_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    challenger VARCHAR(42) NOT NULL,
    position VARCHAR(42) NOT NULL,
    size NUMERIC(78, 0) NOT NULL,
    number NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS mintinghub_challenge_averted_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    position VARCHAR(42) NOT NULL,
    number NUMERIC(78, 0) NOT NULL,
    size NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS mintinghub_challenge_succeeded_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    position VARCHAR(42) NOT NULL,
    number NUMERIC(78, 0) NOT NULL,
    bid NUMERIC(78, 0) NOT NULL,
    acquired_collateral NUMERIC(78, 0) NOT NULL,
    challenge_size NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS mintinghub_postponed_return_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    collateral VARCHAR(42) NOT NULL,
    beneficiary VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS mintinghub_forced_sale_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    pos VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    price_e36_minus_decimals NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS roller_roll_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    source VARCHAR(42) NOT NULL,
    coll_withdraw NUMERIC(78, 0) NOT NULL,
    repay NUMERIC(78, 0) NOT NULL,
    target VARCHAR(42) NOT NULL,
    coll_deposit NUMERIC(78, 0) NOT NULL,
    mint NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS position_denied_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    position VARCHAR(42) NOT NULL,
    sender VARCHAR(42) NOT NULL,
    message TEXT,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS position_minting_update_events (
    tx_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    position VARCHAR(42) NOT NULL,
    collateral NUMERIC(78, 0) NOT NULL,
    price NUMERIC(78, 0) NOT NULL,
    principal NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

-- =============================================================================
-- STATE TABLES
-- =============================================================================

-- Single row for deuro state
CREATE TABLE IF NOT EXISTS deuro_state (
    id INTEGER DEFAULT 1,
    deuro_total_supply NUMERIC(78, 0) NOT NULL,
    deps_total_supply NUMERIC(78, 0) NOT NULL,
    equity_shares NUMERIC(78, 0) NOT NULL,
    equity_price NUMERIC(78, 0) NOT NULL,
    reserve_total NUMERIC(78, 0) NOT NULL,
    reserve_minter NUMERIC(78, 0) NOT NULL,
    reserve_equity NUMERIC(78, 0) NOT NULL,

    -- daily metrics
    deuro_volume_24h NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    deuro_transfer_count_24h INTEGER DEFAULT 0 NOT NULL,
    deuro_unique_addresses_24h INTEGER DEFAULT 0 NOT NULL,
    deps_volume_24h NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    deps_transfer_count_24h INTEGER DEFAULT 0 NOT NULL,
    deps_unique_addresses_24h INTEGER DEFAULT 0 NOT NULL,
    equity_trade_volume_24h NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    equity_trade_count_24h INTEGER DEFAULT 0 NOT NULL,
    equity_delegations_24h INTEGER DEFAULT 0 NOT NULL,
    savings_added_24h NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    savings_withdrawn_24h NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    savings_interest_collected_24h NUMERIC(78, 0) DEFAULT 0 NOT NULL,

    -- global metrics
    deuro_loss NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    deuro_profit NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    deuro_profit_distributed NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    savings_total NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    savings_interest_collected NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    savings_rate NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    frontend_fees_collected NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    frontends_active INTEGER DEFAULT 0 NOT NULL,
    
    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Single row per position
CREATE TABLE IF NOT EXISTS position_states (
    position_address VARCHAR(42) NOT NULL,
    status VARCHAR(20) NOT NULL,
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
    
    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (position_address)
);

-- Single row per challenge
CREATE TABLE IF NOT EXISTS challenge_states (
    challenge_id INTEGER NOT NULL,
    challenger_address VARCHAR(42) NOT NULL,
    position_address VARCHAR(42) NOT NULL,
    position_owner_address VARCHAR(42) NOT NULL,
    start_timestamp BIGINT NOT NULL,
    initial_size NUMERIC(78, 0) NOT NULL,
    size NUMERIC(78, 0) NOT NULL,
    collateral_address VARCHAR(42) NOT NULL,
    liq_price NUMERIC(78, 0) NOT NULL,
    phase INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    current_price NUMERIC(78, 0) NOT NULL,
    
    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (challenge_id)
);

-- Single row per collateral token
CREATE TABLE IF NOT EXISTS collateral_states (
    token_address VARCHAR(42) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    decimals INTEGER NOT NULL,
    total_collateral NUMERIC(78, 0) NOT NULL,
    position_count INTEGER NOT NULL,
    
    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (token_address)
);

-- Single row per bridge
CREATE TABLE IF NOT EXISTS bridge_states (
    bridge_address VARCHAR(42) NOT NULL,
    eur_address VARCHAR(42) NOT NULL,
    eur_symbol VARCHAR(10) NOT NULL,
    eur_decimals INTEGER NOT NULL,
    deuro_address VARCHAR(42) NOT NULL,
    horizon NUMERIC(78, 0) NOT NULL,
    "limit" NUMERIC(78, 0) NOT NULL,
    minted NUMERIC(78, 0) NOT NULL,
    
    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (bridge_address)
);

-- Single row per minter
CREATE TABLE IF NOT EXISTS minter_states (
    minter VARCHAR(42) NOT NULL,
    status VARCHAR(20) NOT NULL,
    application_date TIMESTAMP WITH TIME ZONE NOT NULL,
    application_period NUMERIC(78, 0) NOT NULL,
    application_fee NUMERIC(78, 0) NOT NULL,
    message TEXT,
    denial_date TIMESTAMP WITH TIME ZONE,
    denial_message TEXT,
    deuro_minted NUMERIC(78, 0) DEFAULT 0 NOT NULL,
    deuro_burned NUMERIC(78, 0) DEFAULT 0 NOT NULL,

    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (minter)
);



-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Event indexes
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

CREATE INDEX IF NOT EXISTS idx_mintinghub_position_opened_events_timestamp ON mintinghub_position_opened_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mintinghub_position_opened_events_owner ON mintinghub_position_opened_events (owner);
CREATE INDEX IF NOT EXISTS idx_mintinghub_position_opened_events_position ON mintinghub_position_opened_events (position);

CREATE INDEX IF NOT EXISTS idx_position_denied_events_timestamp ON position_denied_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_position_denied_events_position ON position_denied_events (position);
CREATE INDEX IF NOT EXISTS idx_position_denied_events_sender ON position_denied_events (sender);

CREATE INDEX IF NOT EXISTS idx_mintinghub_challenge_started_events_timestamp ON mintinghub_challenge_started_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mintinghub_challenge_started_events_challenger ON mintinghub_challenge_started_events (challenger);
CREATE INDEX IF NOT EXISTS idx_mintinghub_challenge_started_events_position ON mintinghub_challenge_started_events (position);

CREATE INDEX IF NOT EXISTS idx_mintinghub_challenge_averted_events_timestamp ON mintinghub_challenge_averted_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mintinghub_challenge_averted_events_position ON mintinghub_challenge_averted_events (position);

CREATE INDEX IF NOT EXISTS idx_mintinghub_challenge_succeeded_events_timestamp ON mintinghub_challenge_succeeded_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mintinghub_challenge_succeeded_events_position ON mintinghub_challenge_succeeded_events (position);

CREATE INDEX IF NOT EXISTS idx_mintinghub_postponed_return_events_timestamp ON mintinghub_postponed_return_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mintinghub_postponed_return_events_beneficiary ON mintinghub_postponed_return_events (beneficiary);

CREATE INDEX IF NOT EXISTS idx_mintinghub_forced_sale_events_timestamp ON mintinghub_forced_sale_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mintinghub_forced_sale_events_pos ON mintinghub_forced_sale_events (pos);

CREATE INDEX IF NOT EXISTS idx_position_minting_update_events_timestamp ON position_minting_update_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_position_minting_update_events_position ON position_minting_update_events (position);

CREATE INDEX IF NOT EXISTS idx_deuro_loss_events_timestamp ON deuro_loss_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deuro_loss_events_reporting_minter ON deuro_loss_events (reporting_minter);

CREATE INDEX IF NOT EXISTS idx_deuro_profit_events_timestamp ON deuro_profit_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deuro_profit_events_reporting_minter ON deuro_profit_events (reporting_minter);

CREATE INDEX IF NOT EXISTS idx_deuro_profit_distributed_events_timestamp ON deuro_profit_distributed_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deuro_profit_distributed_events_recipient ON deuro_profit_distributed_events (recipient);

CREATE INDEX IF NOT EXISTS idx_equity_delegation_events_timestamp ON equity_delegation_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_equity_delegation_events_from ON equity_delegation_events (from_address);
CREATE INDEX IF NOT EXISTS idx_equity_delegation_events_to ON equity_delegation_events (to_address);

CREATE INDEX IF NOT EXISTS idx_savings_interest_collected_events_timestamp ON savings_interest_collected_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_savings_interest_collected_events_account ON savings_interest_collected_events (account);

CREATE INDEX IF NOT EXISTS idx_savings_rate_proposed_events_timestamp ON savings_rate_proposed_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_savings_rate_proposed_events_who ON savings_rate_proposed_events (who);

CREATE INDEX IF NOT EXISTS idx_savings_rate_changed_events_timestamp ON savings_rate_changed_events (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_roller_roll_events_timestamp ON roller_roll_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_roller_roll_events_source ON roller_roll_events (source);
CREATE INDEX IF NOT EXISTS idx_roller_roll_events_target ON roller_roll_events (target);

-- State table indexes
CREATE INDEX IF NOT EXISTS idx_position_states_owner ON position_states (owner_address);
CREATE INDEX IF NOT EXISTS idx_position_states_is_closed ON position_states (is_closed);
CREATE INDEX IF NOT EXISTS idx_position_states_status ON position_states (status);
CREATE INDEX IF NOT EXISTS idx_position_states_original ON position_states (original_address);
CREATE INDEX IF NOT EXISTS idx_position_states_collateral ON position_states (collateral_address);

CREATE INDEX IF NOT EXISTS idx_challenge_states_position ON challenge_states (position_address);
CREATE INDEX IF NOT EXISTS idx_challenge_states_challenger ON challenge_states (challenger_address);
CREATE INDEX IF NOT EXISTS idx_challenge_states_status ON challenge_states (status);
CREATE INDEX IF NOT EXISTS idx_challenge_states_phase ON challenge_states (phase);
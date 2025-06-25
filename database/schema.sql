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

CREATE TABLE IF NOT EXISTS deuro_state (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_supply NUMERIC(78, 0) NOT NULL,
    minter_reserve NUMERIC(78, 0) NOT NULL,
    reserve_balance NUMERIC(78, 0) NOT NULL,
    equity NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (block_number)
);

CREATE TABLE IF NOT EXISTS equity_state (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_shares NUMERIC(78, 0) NOT NULL,
    total_votes NUMERIC(78, 0) NOT NULL,
    price NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (block_number)
);

CREATE TABLE IF NOT EXISTS deps_state (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_wrapped NUMERIC(78, 0) NOT NULL,
    wrapper_balance NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (block_number)
);

CREATE TABLE IF NOT EXISTS savings_state (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_savings NUMERIC(78, 0) NOT NULL,
    current_rate NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (block_number)
);

CREATE TABLE IF NOT EXISTS frontend_state (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_fees_collected NUMERIC(78, 0) NOT NULL,
    active_frontends INTEGER NOT NULL,
    fee_rate INTEGER NOT NULL,
    savings_fee_rate INTEGER NOT NULL,
    minting_fee_rate INTEGER NOT NULL,
    PRIMARY KEY (block_number)
);

CREATE TABLE IF NOT EXISTS mintinghub_state (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_positions INTEGER NOT NULL,
    total_collateral NUMERIC(78, 0) NOT NULL,
    total_minted NUMERIC(78, 0) NOT NULL,
    PRIMARY KEY (block_number)
);

-- TODO: Table column names must closely match the contract state variable names!!
CREATE TABLE IF NOT EXISTS position_states (
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
    price NUMERIC(78, 0) NOT NULL,
    challenged_amount NUMERIC(78, 0) NOT NULL,
    expiration TIMESTAMP WITH TIME ZONE NOT NULL,
    is_original BOOLEAN NOT NULL,
    is_clone BOOLEAN NOT NULL,
    is_closed BOOLEAN NOT NULL,
    PRIMARY KEY (block_number, position_address)
);

CREATE TABLE IF NOT EXISTS challenge_states (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    challenge_number BIGINT NOT NULL,
    position_address VARCHAR(42) NOT NULL,
    challenger_address VARCHAR(42) NOT NULL,
    start_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    challenge_size NUMERIC(78, 0) NOT NULL,
    is_active BOOLEAN NOT NULL,
    PRIMARY KEY (block_number, challenge_number)
);

CREATE TABLE IF NOT EXISTS collateral_states (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    decimals INTEGER NOT NULL,
    total_collateral NUMERIC(78, 0) NOT NULL,
    position_count INTEGER NOT NULL,
    PRIMARY KEY (block_number, token_address)
);

CREATE TABLE IF NOT EXISTS bridge_states (
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    bridge_address VARCHAR(42) NOT NULL,
    source_token VARCHAR(42) NOT NULL,
    horizon TIMESTAMP WITH TIME ZONE NOT NULL,
    limit NUMERIC(78, 0) NOT NULL,
    total_bridged NUMERIC(78, 0) NOT NULL,
    is_active BOOLEAN NOT NULL,
    PRIMARY KEY (block_number, bridge_address)
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_deuro_states_block_number ON deuro_state (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_deuro_states_timestamp ON deuro_state (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_equity_states_block_number ON equity_state (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_equity_states_timestamp ON equity_state (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_position_states_block_number ON position_states (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_position_states_position_address ON position_states (position_address);
CREATE INDEX IF NOT EXISTS idx_position_states_owner ON position_states (owner_address);
CREATE INDEX IF NOT EXISTS idx_position_states_is_closed ON position_states (is_closed);

CREATE INDEX IF NOT EXISTS idx_challenge_states_block_number ON challenge_states (block_number DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_states_position ON challenge_states (position_address);
CREATE INDEX IF NOT EXISTS idx_challenge_states_is_active ON challenge_states (is_active);


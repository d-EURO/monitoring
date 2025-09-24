-- All events (raw)
CREATE TABLE IF NOT EXISTS raw_events (
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    args JSONB NOT NULL,  -- ALL decoded event parameters
    block_number BIGINT NOT NULL,
    timestamp BIGINT NOT NULL, -- block timestamp as Unix timestamp in seconds
    alerted BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_block ON raw_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON raw_events(topic, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_contract ON raw_events(contract_address, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_data ON raw_events USING GIN(args);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON raw_events(timestamp DESC);

-- Backfill: ensure alerted column exists on existing deployments
ALTER TABLE raw_events ADD COLUMN IF NOT EXISTS alerted BOOLEAN NOT NULL DEFAULT FALSE;

-- Index over alert status and time for efficient querying of unalerted recent events
CREATE INDEX IF NOT EXISTS idx_events_alert ON raw_events(alerted, timestamp DESC);

-- Dynamic Contract Registry (auto-populated from events)
CREATE TABLE IF NOT EXISTS contracts (
    address VARCHAR(42) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- e.g. DEURO, EQUITY, POSITION, MINTER, BRIDGE
    metadata JSONB, -- flexible storage for contract-specific data
    timestamp BIGINT NOT NULL -- block timestamp as Unix timestamp in seconds when added to protocol
);

CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(type);
CREATE INDEX IF NOT EXISTS idx_contracts_metadata ON contracts USING GIN(metadata);

-- Processing State
CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_processed_block BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Token registry
CREATE TABLE IF NOT EXISTS tokens (
    address VARCHAR(42) PRIMARY KEY,
    symbol VARCHAR(20),
    name VARCHAR(100),
    decimals INTEGER,
    price NUMERIC(20, 8), -- Current price in EUR
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);

-- Position States
CREATE TABLE IF NOT EXISTS position_states (
    -- Fixed fields
    address VARCHAR(42) PRIMARY KEY, -- Position.address
    "limit" NUMERIC(78, 0) NOT NULL, -- Position.limit
    owner VARCHAR(42) NOT NULL, -- Position.owner
    original VARCHAR(42) NOT NULL, -- Position.original
    collateral VARCHAR(42) NOT NULL, -- Position.collateral
    minimum_collateral NUMERIC(78, 0) NOT NULL, -- Position.minimumCollateral
    risk_premium_ppm INTEGER NOT NULL, -- Position.riskPremiumPPM
    reserve_contribution INTEGER NOT NULL, -- Position.reserveContribution
    challenge_period BIGINT NOT NULL, -- Position.challengePeriod (seconds)
    start_timestamp BIGINT NOT NULL, -- Position.start (Unix timestamp in seconds)
    expiration BIGINT NOT NULL, -- Position.expiration (Unix timestamp in seconds)
    created BIGINT NOT NULL, -- PositionOpened event timestamp (Unix timestamp in seconds)

    -- Dynamic fields
    price NUMERIC(78, 0) NOT NULL, -- Position.price
    virtual_price NUMERIC(78, 0) NOT NULL, -- Position.virtualPrice
    collateral_amount NUMERIC(78, 0) NOT NULL, -- ERC20(collateral_address).balanceOf
    expired_purchase_price NUMERIC(78, 0) NOT NULL, -- MintingHub.expiredPurchasePrice(position_address)
    collateral_requirement NUMERIC(78, 0) NOT NULL, -- Position.getCollateralRequirement
    principal NUMERIC(78, 0) NOT NULL, -- Position.principal
    interest NUMERIC(78, 0) NOT NULL, -- Position.interest
    debt NUMERIC(78, 0) NOT NULL, -- Position.getDebt
    fixed_annual_rate_ppm INTEGER NOT NULL, -- Position.fixedAnnualRatePPM
    last_accrual BIGINT NOT NULL, -- Position.lastAccrual (Unix timestamp in seconds)
    cooldown BIGINT NOT NULL, -- Position.cooldown (Unix timestamp in seconds)
    challenged_amount NUMERIC(78, 0) NOT NULL, -- Position.challengedAmount
    available_for_minting NUMERIC(78, 0) NOT NULL, -- Position.availableForMinting
    available_for_clones NUMERIC(78, 0) NOT NULL, -- Position.availableForClones
    is_closed BOOLEAN NOT NULL, -- Position.isClosed
    is_denied BOOLEAN NOT NULL DEFAULT FALSE, -- derived from PositionDenied events

    -- metadata
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_position_states_owner ON position_states(owner);
CREATE INDEX IF NOT EXISTS idx_position_states_original ON position_states(original);
CREATE INDEX IF NOT EXISTS idx_position_states_collateral ON position_states(collateral);
CREATE INDEX IF NOT EXISTS idx_position_states_is_closed ON position_states(is_closed);

-- Challenge States
CREATE TABLE IF NOT EXISTS challenge_states (
    -- Fixed fields
    challenge_id INTEGER PRIMARY KEY, -- MintingHub.ChallengeStarted.number
    challenger_address VARCHAR(42) NOT NULL, -- MintingHub.ChallengeStarted.challenger
    position_address VARCHAR(42) NOT NULL, -- MintingHub.ChallengeStarted.position
    start_timestamp BIGINT NOT NULL, -- MintingHub.ChallengeStarted event timestamp
    initial_size NUMERIC(78, 0) NOT NULL, -- MintingHub.ChallengeStarted.size

    -- Dynamic fields
    size NUMERIC(78, 0) NOT NULL, -- MintingHub.challenges[challenge_id].size
    current_price NUMERIC(78, 0) NOT NULL, -- MintingHub.price(challenge_id)

    -- metadata
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_challenge_states_position ON challenge_states(position_address);
CREATE INDEX IF NOT EXISTS idx_challenge_states_challenger ON challenge_states(challenger_address);

-- Collateral States
CREATE TABLE IF NOT EXISTS collateral_states (
    -- Fixed fields
    token_address VARCHAR(42) PRIMARY KEY, -- MintingHub.PositionOpened.collateral

    -- Dynamic fields
    total_collateral NUMERIC(78, 0) NOT NULL, -- derived from position_states
    position_count INTEGER NOT NULL, -- derived from position_states
    total_limit NUMERIC(78, 0) NOT NULL DEFAULT 0, -- derived from position_states
    total_available_for_minting NUMERIC(78, 0) NOT NULL DEFAULT 0, -- derived from position_states

    -- metadata
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Minter States
CREATE TABLE IF NOT EXISTS minter_states (
    -- Fixed fields
    address VARCHAR(42) PRIMARY KEY, -- DecentralizedEuro.MinterApplied.minter
    type VARCHAR(20) NOT NULL, -- MINTER, BRIDGE
    application_timestamp BIGINT NOT NULL, -- MinterApplied event timestamp (Unix seconds)
    application_period BIGINT, -- DecentralizedEuro.MinterApplied.applicationPeriod (seconds)
    application_fee NUMERIC(78, 0), -- DecentralizedEuro.MinterApplied.applicationFee
    message TEXT, -- DecentralizedEuro.MinterApplied.message

    -- Bridge-specific fixed fields (NULL for generic minters)
    bridge_token VARCHAR(42), -- IStablecoinBridge(<address>).eur
    bridge_horizon BIGINT, -- IStablecoinBridge(<address>).horizon (Unix timestamp)
    bridge_limit NUMERIC(78, 0), -- IStablecoinBridge(<address>)."limit"

    -- Dynamic fields
    status VARCHAR(20) NOT NULL, -- PROPOSED, DENIED, APPROVED, EXPIRED

    -- Bridge-specific dynamic fields
    bridge_minted NUMERIC(78, 0), -- IStablecoinBridge(<address>).minted

    -- metadata
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_minter_states_type ON minter_states(type);
CREATE INDEX IF NOT EXISTS idx_minter_states_status ON minter_states(status);
CREATE INDEX IF NOT EXISTS idx_minter_states_bridge_token ON minter_states(bridge_token) WHERE bridge_token IS NOT NULL;

-- System State (single row for global metrics)
-- CREATE TABLE IF NOT EXISTS system_state (
--     id INTEGER PRIMARY KEY DEFAULT 1,
--     -- Token supplies
--     deuro_total_supply NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.totalSupply
--     deps_total_supply NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DEPSWrapper.totalSupply
    
--     -- Equity metrics
--     equity_shares NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: Equity.totalSupply
--     equity_price NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: Equity.price

--     -- Reserve metrics
--     reserve_total NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.reserve
--     reserve_minter NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.minterReserve
--     reserve_equity NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.equity

--     -- Savings metrics
--     savings_total NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.balanceOf(SavingsGateway.address)
--     savings_interest_collected NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: sum over SavingsGateway.InterestCollected events
--     savings_rate NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: SavingsGateway.currentRatePPM

--     -- Profit/Loss tracking
--     deuro_loss NUMERIC(78, 0) DEFAULT 0 NOT NULL, -- dynamic: sum over DecentralizedEURO.Loss events
--     deuro_profit NUMERIC(78, 0) DEFAULT 0 NOT NULL, -- dynamic: sum over DecentralizedEURO.Profit events
--     deuro_profit_distributed NUMERIC(78, 0) DEFAULT 0 NOT NULL, -- dynamic: sum over DecentralizedEURO.ProfitDistributed events

--     -- Frontend metrics
--     frontend_fees_collected NUMERIC(78, 0) DEFAULT 0 NOT NULL, -- dynamic: sum over FrontendGateway.FrontendCodeRewardsWithdrawn
--     frontends_active INTEGER DEFAULT 0 NOT NULL, -- dynamic: count over FrontendCodeRegistered events

--     -- Currency rates
--     usd_to_eur_rate NUMERIC(10, 6) DEFAULT 0 NOT NULL, -- dynamic: getExchangeRate('USD', 'EUR')
--     usd_to_chf_rate NUMERIC(10, 6) DEFAULT 0 NOT NULL, -- dynamic: getExchangeRate('USD', 'CHF')

--     -- metadata
--     block_number BIGINT NOT NULL DEFAULT 0,
--     timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
--     CONSTRAINT system_single_row CHECK (id = 1)
-- );

-- =============================================================================
-- INITIALIZATION
-- =============================================================================

-- Initialize system state (required for UPDATE queries to work)
-- INSERT INTO system_state (id)
-- VALUES (1)
-- ON CONFLICT (id) DO NOTHING;
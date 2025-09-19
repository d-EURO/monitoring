-- All events (raw)
CREATE TABLE IF NOT EXISTS raw_events (
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    args JSONB NOT NULL,  -- ALL decoded event parameters
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_block ON raw_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON raw_events(topic, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_contract ON raw_events(contract_address, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_data ON raw_events USING GIN(args);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON raw_events(timestamp DESC);

-- Dynamic Contract Registry (auto-populated from events)
CREATE TABLE IF NOT EXISTS contracts (
    address VARCHAR(42) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- e.g. DEURO, EQUITY, POSITION, MINTER, BRIDGE
    created_at_block BIGINT NOT NULL, -- TODO: Change to timestamp instead of block number?
    is_active BOOLEAN DEFAULT true,
    metadata JSONB, -- flexible storage for contract-specific data
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(type);
CREATE INDEX IF NOT EXISTS idx_contracts_active ON contracts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contracts_metadata ON contracts USING GIN(metadata);

-- Processing State
CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_processed_block BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Token registry
CREATE TABLE IF NOT EXISTS tokens (
    address VARCHAR(42) PRIMARY KEY,
    symbol VARCHAR(20),
    name VARCHAR(100),
    decimals INTEGER,
    price NUMERIC(20, 8), -- Current price in EUR
    price_updated_at TIMESTAMP WITH TIME ZONE, -- When price was last updated
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    challenge_period NUMERIC(78, 0) NOT NULL, -- Position.challengePeriod
    start_timestamp NUMERIC(78, 0) NOT NULL, -- Position.start
    expiration NUMERIC(78, 0) NOT NULL, -- Position.expiration
    created TIMESTAMP WITH TIME ZONE, -- PositionOpened event timestamp

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
    last_accrual NUMERIC(78, 0) NOT NULL, -- Position.lastAccrual
    cooldown NUMERIC(78, 0) NOT NULL, -- Position.cooldown
    challenged_amount NUMERIC(78, 0) NOT NULL, -- Position.challengedAmount
    available_for_minting NUMERIC(78, 0) NOT NULL, -- Position.availableForMinting
    available_for_clones NUMERIC(78, 0) NOT NULL, -- Position.availableForClones
    is_closed BOOLEAN NOT NULL, -- Position.isClosed

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
    symbol VARCHAR(20) NOT NULL, -- ERC20(<token_address>).symbol
    decimals INTEGER NOT NULL, -- ERC20(<token_address>).decimals

    -- Dynamic fields
    total_collateral NUMERIC(78, 0) NOT NULL, -- derived from position_states
    position_count INTEGER NOT NULL, -- derived from position_states
    total_limit NUMERIC(78, 0) NOT NULL DEFAULT 0, -- derived from position_states
    total_available_for_minting NUMERIC(78, 0) NOT NULL DEFAULT 0, -- derived from position_states
    price NUMERIC(20, 8) DEFAULT 0, -- price.service.ts:getTokenPricesInEur

    -- metadata
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collateral_states_symbol ON collateral_states(symbol);

-- Minter States
CREATE TABLE IF NOT EXISTS minter_states (
    -- Fixed fields
    minter_address VARCHAR(42) PRIMARY KEY, -- DecentralizedEuro.MinterApplied.minter
    minter_type VARCHAR(20) NOT NULL, -- REGULAR, BRIDGE
    application_date TIMESTAMP WITH TIME ZONE, -- DecentralizedEuro.MinterApplied event timestamp
    application_period NUMERIC(78, 0), -- DecentralizedEuro.MinterApplied.applicationPeriod
    application_fee NUMERIC(78, 0), -- DecentralizedEuro.MinterApplied.applicationFee
    message TEXT, -- DecentralizedEuro.MinterApplied.message

    -- Bridge-specific fixed fields (NULL for regular minters)
    bridge_token_address VARCHAR(42), -- IStablecoinBridge(<minter_address>).eur
    bridge_token_symbol VARCHAR(10), -- ERC20(<bridge_token_address>).symbol
    bridge_token_decimals INTEGER, -- ERC20(<bridge_token_address>).decimals
    bridge_horizon NUMERIC(78, 0), -- IStablecoinBridge(<minter_address>).horizon
    bridge_limit NUMERIC(78, 0), -- IStablecoinBridge(<minter_address>)."limit"

    -- Dynamic fields
    status VARCHAR(20) NOT NULL, -- PENDING, APPROVED, DENIED
    denial_date TIMESTAMP WITH TIME ZONE, -- DecentralizedEuro.MinterDenied event timestamp
    denial_message TEXT, -- DecentralizedEuro.MinterDenied.message

    -- Bridge-specific dynamic fields
    bridge_minted NUMERIC(78, 0), -- IStablecoinBridge(<minter_address>).minted

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
    deuro_total_supply NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.totalSupply
    deps_total_supply NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DEPSWrapper.totalSupply
    
    -- Equity metrics
    equity_shares NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: Equity.totalSupply
    equity_price NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: Equity.price

    -- Reserve metrics
    reserve_total NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.reserve
    reserve_minter NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.minterReserve
    reserve_equity NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.equity

    -- Savings metrics
    savings_total NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: DecentralizedEURO.balanceOf(SavingsGateway.address)
    savings_interest_collected NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: sum over SavingsGateway.InterestCollected events
    savings_rate NUMERIC(78, 0) NOT NULL DEFAULT 0, -- dynamic: SavingsGateway.currentRatePPM

    -- Profit/Loss tracking
    deuro_loss NUMERIC(78, 0) DEFAULT 0 NOT NULL, -- dynamic: sum over DecentralizedEURO.Loss events
    deuro_profit NUMERIC(78, 0) DEFAULT 0 NOT NULL, -- dynamic: sum over DecentralizedEURO.Profit events
    deuro_profit_distributed NUMERIC(78, 0) DEFAULT 0 NOT NULL, -- dynamic: sum over DecentralizedEURO.ProfitDistributed events

    -- Frontend metrics
    frontend_fees_collected NUMERIC(78, 0) DEFAULT 0 NOT NULL, -- dynamic: sum over FrontendGateway.FrontendCodeRewardsWithdrawn
    frontends_active INTEGER DEFAULT 0 NOT NULL, -- dynamic: count over FrontendCodeRegistered events

    -- Currency rates
    usd_to_eur_rate NUMERIC(10, 6) DEFAULT 0 NOT NULL, -- dynamic: getExchangeRate('USD', 'EUR')
    usd_to_chf_rate NUMERIC(10, 6) DEFAULT 0 NOT NULL, -- dynamic: getExchangeRate('USD', 'CHF')

    -- metadata
    block_number BIGINT NOT NULL DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT system_single_row CHECK (id = 1)
);

-- =============================================================================
-- INITIALIZATION
-- =============================================================================

-- Initialize system state (required for UPDATE queries to work)
INSERT INTO system_state (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
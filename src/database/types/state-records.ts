export interface PositionStateRecord {
	block_number: string;
	timestamp: Date;
	position_address: string;
	status: string;
	owner_address: string;
	original_address: string;
	collateral_address: string;
	collateral_balance: string;
	price: string;
	virtual_price: string;
	expired_purchase_price: string;
	collateral_requirement: string;
	debt: string;
	interest: string;
	minimum_collateral: string;
	minimum_challenge_amount: string;
	limit_amount: string;
	principal: string;
	risk_premium_ppm: number;
	reserve_contribution: number;
	fixed_annual_rate_ppm: number;
	last_accrual: string;
	start_timestamp: string;
	cooldown_period: string;
	expiration_timestamp: string;
	challenged_amount: string;
	challenge_period: string;
	is_closed: boolean;
	available_for_minting: string;
	available_for_clones: string;
	created?: number;
	market_price?: string;
	collateralization_ratio?: string;
}

export interface ChallengeRecord {
	block_number: string;
	timestamp: Date;
	challenge_id: number;
	challenger_address: string;
	position_address: string;
	position_owner_address: string;
	start_timestamp: number;
	initial_size: string;
	size: string;
	collateral_address: string;
	liq_price: string;
	phase: number;
	status: string;
	current_price: string;
}

export interface MinterStateRecord {
	minter: string;
	status: string;
	application_period: string;
	application_fee: string;
	application_date: Date;
	message?: string;
	denial_date?: Date;
	denial_message?: string;
}

export interface BridgeStateRecord {
	block_number: string;
	timestamp: Date;
	bridge_address: string;
	eur_address: string;
	eur_symbol: string;
	eur_decimals: number;
	deuro_address: string;
	horizon: string;
	limit: string;
	minted: string;
}

export interface DeuroStateRecord {
	deuro_total_supply: string;
	deps_total_supply: string;
	equity_shares: string;
	equity_price: string;
	reserve_total: string;
	reserve_minter: string;
	reserve_equity: string;
	deuro_volume_24h: string;
	deuro_transfer_count_24h: number;
	deuro_unique_addresses_24h: number;
	deps_volume_24h: string;
	deps_transfer_count_24h: number;
	deps_unique_addresses_24h: number;
	equity_trade_volume_24h: string;
	equity_trade_count_24h: number;
	equity_delegations_24h: number;
	savings_added_24h: string;
	savings_withdrawn_24h: string;
	savings_interest_collected_24h: string;
	deuro_minted_24h: string;
	deuro_burned_24h: string;
	deuro_loss: string;
	deuro_profit: string;
	deuro_profit_distributed: string;
	savings_total: string;
	savings_interest_collected: string;
	savings_rate: string;
	frontend_fees_collected: string;
	frontends_active: number;
	usd_to_eur_rate: number;
	usd_to_chf_rate: number;
	block_number: string;
	timestamp: Date;
}

export interface CollateralStateRecord {
	block_number: string;
	timestamp: Date;
	token_address: string;
	symbol: string;
	decimals: number;
	total_collateral: string;
	position_count: number;
	price: string;
}

export interface DeuroStateData {
	deuro_total_supply: bigint;
	deps_total_supply: bigint;
	equity_shares: bigint;
	equity_price: bigint;
	reserve_total: bigint;
	reserve_minter: bigint;
	reserve_equity: bigint;
	deuro_volume_24h: bigint;
	deuro_transfer_count_24h: number;
	deuro_unique_addresses_24h: number;
	deps_volume_24h: bigint;
	deps_transfer_count_24h: number;
	deps_unique_addresses_24h: number;
	equity_trade_volume_24h: bigint;
	equity_trade_count_24h: number;
	equity_delegations_24h: number;
	deuro_loss: bigint;
	deuro_profit: bigint;
	deuro_profit_distributed: bigint;
	savings_total: bigint;
	savings_rate: bigint;
	savings_added_24h: bigint;
	savings_withdrawn_24h: bigint;
	savings_interest_collected_24h: bigint;
	savings_interest_collected: bigint;
}

export interface SystemStateData extends DeuroStateData {
	frontend_fees_collected: bigint;
	frontends_active: number;
	block_number: number;
	timestamp: Date;
}

import { ApiProperty } from '@nestjs/swagger';

export class SystemStateDto {
	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;

	// Core state
	@ApiProperty({ description: 'Total supply of dEURO tokens' })
	deuro_total_supply: string;

	@ApiProperty({ description: 'Total supply of DEPS tokens' })
	deps_total_supply: string;

	@ApiProperty({ description: 'Total equity shares' })
	equity_shares: string;

	@ApiProperty({ description: 'Current equity price' })
	equity_price: string;

	@ApiProperty({ description: 'Total reserve balance' })
	reserve_total: string;

	@ApiProperty({ description: 'Minter reserve balance' })
	reserve_minter: string;

	@ApiProperty({ description: 'Equity reserve balance' })
	reserve_equity: string;

	// 24h metrics
	@ApiProperty({ description: 'dEURO transfer volume in last 24 hours' })
	deuro_volume_24h: string;

	@ApiProperty({ description: 'Number of dEURO transfers in last 24 hours' })
	deuro_transfer_count_24h: number;

	@ApiProperty({ description: 'Unique addresses in dEURO transfers in last 24 hours' })
	deuro_unique_addresses_24h: number;

	@ApiProperty({ description: 'DEPS transfer volume in last 24 hours' })
	deps_volume_24h: string;

	@ApiProperty({ description: 'Number of DEPS transfers in last 24 hours' })
	deps_transfer_count_24h: number;

	@ApiProperty({ description: 'Unique addresses in DEPS transfers in last 24 hours' })
	deps_unique_addresses_24h: number;

	@ApiProperty({ description: 'Equity trade volume in last 24 hours' })
	equity_trade_volume_24h: string;

	@ApiProperty({ description: 'Number of equity trades in last 24 hours' })
	equity_trade_count_24h: number;

	@ApiProperty({ description: 'Number of equity delegations in last 24 hours' })
	equity_delegations_24h: number;

	@ApiProperty({ description: 'Amount added to savings in last 24 hours' })
	savings_added_24h: string;

	@ApiProperty({ description: 'Amount withdrawn from savings in last 24 hours' })
	savings_withdrawn_24h: string;

	@ApiProperty({ description: 'Interest collected from savings in last 24 hours' })
	savings_interest_collected_24h: string;

	// Global metrics
	@ApiProperty({ description: 'Total dEURO loss reported' })
	deuro_loss: string;

	@ApiProperty({ description: 'Total dEURO profit reported' })
	deuro_profit: string;

	@ApiProperty({ description: 'Total dEURO profit distributed' })
	deuro_profit_distributed: string;

	@ApiProperty({ description: 'Total amount in savings' })
	savings_total: string;

	@ApiProperty({ description: 'Total interest collected from savings' })
	savings_interest_collected: string;

	@ApiProperty({ description: 'Current savings rate in PPM' })
	savings_rate: string;

	@ApiProperty({ description: 'Total fees collected by frontends' })
	frontend_fees_collected: string;

	@ApiProperty({ description: 'Number of active frontends' })
	frontends_active: number;
}

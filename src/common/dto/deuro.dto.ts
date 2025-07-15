import { ApiProperty } from '@nestjs/swagger';

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
	frontend_fees_collected: bigint;
	frontends_active: number;
	usd_to_eur_rate: number;
	usd_to_chf_rate: number;
}

export class DeuroStateDto {
	@ApiProperty({ description: 'Total supply of dEURO tokens' })
	deuroTotalSupply: string;

	@ApiProperty({ description: 'Total supply of DEPS tokens' })
	depsTotalSupply: string;

	@ApiProperty({ description: 'Total equity shares' })
	equityShares: string;

	@ApiProperty({ description: 'Current equity price' })
	equityPrice: string;

	@ApiProperty({ description: 'Total reserve amount' })
	reserveTotal: string;

	@ApiProperty({ description: 'Reserve allocated to minters' })
	reserveMinter: string;

	@ApiProperty({ description: 'Reserve allocated to equity' })
	reserveEquity: string;

	@ApiProperty({ description: '24-hour dEURO transfer volume' })
	deuroVolume24h: string;

	@ApiProperty({ description: '24-hour dEURO transfer count' })
	deuroTransferCount24h: number;

	@ApiProperty({ description: '24-hour unique dEURO addresses' })
	deuroUniqueAddresses24h: number;

	@ApiProperty({ description: '24-hour DEPS transfer volume' })
	depsVolume24h: string;

	@ApiProperty({ description: '24-hour DEPS transfer count' })
	depsTransferCount24h: number;

	@ApiProperty({ description: '24-hour unique DEPS addresses' })
	depsUniqueAddresses24h: number;

	@ApiProperty({ description: '24-hour equity trade volume' })
	equityTradeVolume24h: string;

	@ApiProperty({ description: '24-hour equity trade count' })
	equityTradeCount24h: number;

	@ApiProperty({ description: '24-hour equity delegations' })
	equityDelegations24h: number;

	@ApiProperty({ description: '24-hour savings added' })
	savingsAdded24h: string;

	@ApiProperty({ description: '24-hour savings withdrawn' })
	savingsWithdrawn24h: string;

	@ApiProperty({ description: '24-hour savings interest collected' })
	savingsInterestCollected24h: string;

	@ApiProperty({ description: 'Total dEURO losses' })
	deuroLoss: string;

	@ApiProperty({ description: 'Total dEURO profits' })
	deuroProfit: string;

	@ApiProperty({ description: 'Total dEURO profits distributed' })
	deuroProfitDistributed: string;

	@ApiProperty({ description: 'Total savings amount' })
	savingsTotal: string;

	@ApiProperty({ description: 'Total savings interest collected' })
	savingsInterestCollected: string;

	@ApiProperty({ description: 'Current savings rate' })
	savingsRate: string;

	@ApiProperty({ description: 'Total frontend fees collected' })
	frontendFeesCollected: string;

	@ApiProperty({ description: 'Number of active frontends' })
	frontendsActive: number;

	@ApiProperty({ description: 'USD to EUR exchange rate' })
	usdToEurRate: number;

	@ApiProperty({ description: 'USD to CHF exchange rate' })
	usdToChfRate: number;
}

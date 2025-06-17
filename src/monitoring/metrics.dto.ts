import { ApiProperty } from '@nestjs/swagger';

class VolumeMetrics {
	@ApiProperty({ description: '24-hour volume' })
	day: string;

	@ApiProperty({ description: '7-day volume' })
	week: string;

	@ApiProperty({ description: '30-day volume' })
	month: string;
}

class CountMetrics {
	@ApiProperty({ description: '24-hour count' })
	day: number;

	@ApiProperty({ description: '7-day count' })
	week: number;

	@ApiProperty({ description: '30-day count' })
	month: number;
}

class TotalAndMonthStats {
	@ApiProperty({ description: 'Total value' })
	total: string;

	@ApiProperty({ description: '30-day value' })
	month: string;
}

class TotalAndMonthCounts {
	@ApiProperty({ description: 'Total count' })
	total: number;

	@ApiProperty({ description: '30-day count' })
	month: number;
}

class VolumeAndCount {
	@ApiProperty({ description: 'Volume' })
	volume: string;

	@ApiProperty({ description: 'Count' })
	count: number;
}

export class DeuroTransferMetrics {
	@ApiProperty({ description: 'Transfer volume metrics', type: VolumeMetrics })
	volume: VolumeMetrics;

	@ApiProperty({ description: 'Transaction count metrics', type: CountMetrics })
	transactions: CountMetrics;

	@ApiProperty({ description: 'Active address metrics', type: CountMetrics })
	activeAddresses: CountMetrics;

	@ApiProperty({ description: 'Average transaction size metrics', type: VolumeMetrics })
	averageSize: VolumeMetrics;
}

export class DeuroMinterMetrics {
	@ApiProperty({ description: 'Minter application statistics' })
	applications: TotalAndMonthCounts;

	@ApiProperty({ description: 'Minter denial statistics' })
	denials: TotalAndMonthCounts;

	@ApiProperty({ description: 'Application success rate' })
	successRate: string;

	@ApiProperty({ description: 'Total application fees' })
	totalFees: string;

	@ApiProperty({ description: 'Average application fee' })
	averageFee: string;
}

export class DeuroProfitLossMetrics {
	@ApiProperty({ description: 'Profit statistics' })
	profits: TotalAndMonthStats;

	@ApiProperty({ description: 'Loss statistics' })
	losses: TotalAndMonthStats;

	@ApiProperty({ description: 'Net profit (profits - losses)' })
	netProfit: string;

	@ApiProperty({ description: 'Profit to loss ratio' })
	profitRatio: string;

	@ApiProperty({ description: 'Total distributed profits' })
	distributed: string;
}

export class DepsFlowMetrics {
	@ApiProperty({ description: 'DEPS wrapping statistics' })
	wraps: VolumeAndCount;

	@ApiProperty({ description: 'DEPS unwrapping statistics' })
	unwraps: VolumeAndCount;

	@ApiProperty({ description: 'Net flow (wraps - unwraps)' })
	netFlow: string;

	@ApiProperty({ description: 'Wrap to unwrap ratio' })
	wrapRatio: string;
}

export class SavingsOverviewMetrics {
	@ApiProperty({ description: 'Savings deposit statistics' })
	saved: TotalAndMonthStats;

	@ApiProperty({ description: 'Savings withdrawal statistics' })
	withdrawn: TotalAndMonthStats;

	@ApiProperty({ description: 'Net savings (saved - withdrawn)' })
	netSavings: string;

	@ApiProperty({ description: 'Total interest paid to savers' })
	interestPaid: string;

	@ApiProperty({ description: 'Number of active savers' })
	activeSavers: number;
}

export class EquityTradingMetrics {
	@ApiProperty({ description: 'Trading volume statistics' })
	volume: TotalAndMonthStats;

	@ApiProperty({ description: 'Trade count statistics' })
	trades: TotalAndMonthCounts;

	@ApiProperty({ description: 'Current equity price' })
	currentPrice: string;

	@ApiProperty({ description: '30-day price change percentage' })
	priceChange30d: string;

	@ApiProperty({ description: 'Number of active traders' })
	activeTraders: number;
}

export class MintingPositionMetrics {
	@ApiProperty({ description: 'Total number of positions opened' })
	totalPositions: number;

	@ApiProperty({ description: 'Positions opened in the last 30 days' })
	month: number;

	@ApiProperty({ description: 'Number of unique position owners' })
	uniqueOwners: number;

	@ApiProperty({ description: 'Position count by collateral type' })
	collateralTypes: Record<string, number>;
}

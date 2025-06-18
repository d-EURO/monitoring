import { ApiProperty } from '@nestjs/swagger';

export enum HealthStatus {
	HEALTHY = 'healthy',
	UNHEALTHY = 'unhealthy',
}

export enum ServiceDetailStatus {
	CONNECTED = 'connected',
	RUNNING = 'running',
	DISCONNECTED = 'disconnected',
	ERROR = 'error',
	TIMEOUT = 'timeout',
	UNAVAILABLE = 'unavailable',
}

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

	@ApiProperty({ description: 'Total application fees' })
	totalFees: string;
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
}

export class SavingsOverviewMetrics {
	@ApiProperty({ description: 'Savings deposit statistics' })
	saved: TotalAndMonthStats;

	@ApiProperty({ description: 'Savings withdrawal statistics' })
	withdrawn: TotalAndMonthStats;

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

class ServiceStatus {
	@ApiProperty({ description: 'Database connection status' })
	database: boolean;

	@ApiProperty({ description: 'Blockchain RPC connection status' })
	blockchain: boolean;

	@ApiProperty({ description: 'Monitoring service status' })
	monitoring: boolean;
}

class ServiceDetails {
	@ApiProperty({ description: 'Database connection details', enum: ServiceDetailStatus })
	database: ServiceDetailStatus;

	@ApiProperty({ description: 'Blockchain connection details', enum: ServiceDetailStatus })
	blockchain: ServiceDetailStatus;

	@ApiProperty({ description: 'Monitoring service details', enum: ServiceDetailStatus })
	monitoring: ServiceDetailStatus;
}

export class HealthStatusDto {
	@ApiProperty({ description: 'Overall system health status', enum: HealthStatus })
	status: HealthStatus;

	@ApiProperty({ description: 'Health check timestamp' })
	timestamp: Date;

	@ApiProperty({ description: 'Individual service health status', type: ServiceStatus })
	services: ServiceStatus;

	@ApiProperty({ description: 'Detailed service status information', type: ServiceDetails })
	details: ServiceDetails;
}

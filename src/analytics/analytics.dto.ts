import { ApiProperty } from '@nestjs/swagger';

export class ProtocolSummaryDto {
	@ApiProperty({ description: 'Total number of transactions' })
	totalTransactions: number;

	@ApiProperty({ description: 'Total transaction volume' })
	totalVolume: string;

	@ApiProperty({ description: 'Number of active positions' })
	activePositions: number;

	@ApiProperty({ description: 'Total savings amount' })
	totalSavings: string;

	@ApiProperty({ description: 'Last update timestamp' })
	lastUpdated: string;
}

export class VolumeMetricDto {
	@ApiProperty({ description: 'Date of the metric' })
	date: string;

	@ApiProperty({ description: 'Number of transactions on this date' })
	transaction_count: number;

	@ApiProperty({ description: 'Total volume on this date' })
	daily_volume: string;
}

export class PositionMetricDto {
	@ApiProperty({ description: 'Collateral contract address' })
	collateral_address: string;

	@ApiProperty({ description: 'Number of positions for this collateral' })
	position_count: number;

	@ApiProperty({ description: 'Total collateral amount' })
	total_collateral: string;
}
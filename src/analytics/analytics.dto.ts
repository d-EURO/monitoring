import { ApiProperty } from '@nestjs/swagger';

export class PeriodAverageDto {
	@ApiProperty({ description: 'Average daily value over the last 24 hours' })
	day: string;

	@ApiProperty({ description: 'Average daily value over the last 7 days' })
	week: string;

	@ApiProperty({ description: 'Average daily value over the last 30 days' })
	month: string;
}

export class ProtocolSummaryDto {
	@ApiProperty({ description: 'Total number of transactions' })
	totalTransactions: number;

	@ApiProperty({ description: 'Total transaction volume' })
	totalVolume: string;

	@ApiProperty({ description: 'Number of active positions' })
	activePositions: number;

	@ApiProperty({ description: 'Total savings amount' })
	totalSavings: string;

	@ApiProperty({ description: 'Average daily volume by period', type: PeriodAverageDto, required: false })
	averageVolume?: PeriodAverageDto;

	@ApiProperty({ description: 'Last update timestamp' })
	lastUpdated: string;
}

import { ApiProperty } from '@nestjs/swagger';

export interface SavingsGatewayState {
	address: string;
	currentRatePPM: bigint;
	nextRatePPM: bigint;
	nextChange: bigint;
	totalSavings: bigint;
	currentTicks: bigint;
}

export class SavingsStateDto {
	@ApiProperty({ description: 'Contract address' })
	address: string;

	@ApiProperty({ description: 'Current savings rate in PPM' })
	currentRatePPM: string;

	@ApiProperty({ description: 'Next savings rate in PPM' })
	nextRatePPM: string;

	@ApiProperty({ description: 'Timestamp of next rate change' })
	nextChange: string;

	@ApiProperty({ description: 'Total amount saved in the gateway' })
	totalSavings: string;

	@ApiProperty({ description: 'Current ticks for interest calculation' })
	currentTicks: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

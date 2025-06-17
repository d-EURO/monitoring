import { ApiProperty } from '@nestjs/swagger';

export interface ChallengeState {
	id: number;
	challenger: string;
	position: string;
	start: number;
	size: bigint;
	collateralAddress: string;
	liqPrice: bigint;
	phase: number;
	currentPrice: bigint;
	positionOwner: string;
}

export class ChallengeStateDto {
	@ApiProperty({ description: 'Challenge ID' })
	id: number;

	@ApiProperty({ description: 'Address of challenger' })
	challenger: string;

	@ApiProperty({ description: 'Address of position being challenged' })
	position: string;

	@ApiProperty({ description: 'Challenge start time' })
	start: number;

	@ApiProperty({ description: 'Size of the challenge' })
	size: string;

	@ApiProperty({ description: 'Collateral token address' })
	collateralAddress: string;

	@ApiProperty({ description: 'Liquidation price' })
	liqPrice: string;

	@ApiProperty({ description: 'Challenge phase' })
	phase: number;

	@ApiProperty({ description: 'Current price' })
	currentPrice: string;

	@ApiProperty({ description: 'Position owner address' })
	positionOwner: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

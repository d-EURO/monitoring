import { ApiProperty } from '@nestjs/swagger';

export enum ChallengeStatus {
	OPENED,
	PARTIALLY_AVERTED,
	AVERTED,
	AUCTION,
	PARTIALLY_SUCCEEDED,
	SUCCEEDED,
}

export interface ChallengeState {
	id: number;
	challenger: string;
	position: string;
	positionOwner: string;
	start: number;
	initialSize: bigint;
	size: string;
	collateralAddress: string;
	liqPrice: string;
	phase: number;
	status: ChallengeStatus;
	currentPrice: string;
}

export class ChallengeStateDto {
	@ApiProperty({ description: 'Challenge ID' })
	id: number;

	@ApiProperty({ description: 'Address of challenger' })
	challenger: string;

	@ApiProperty({ description: 'Address of position being challenged' })
	position: string;

	@ApiProperty({ description: 'Position owner address' })
	positionOwner: string;

	@ApiProperty({ description: 'Challenge start time' })
	start: number;

	@ApiProperty({ description: 'Initial size of the challenge' })
	initialSize: string;

	@ApiProperty({ description: 'Size of the challenge' })
	size: string;

	@ApiProperty({ description: 'Collateral token address' })
	collateralAddress: string;

	@ApiProperty({ description: 'Liquidation price' })
	liqPrice: string;

	@ApiProperty({ description: 'Challenge phase' })
	phase: number;

	@ApiProperty({ description: 'Current status of the challenge', enum: ChallengeStatus })
	status: ChallengeStatus;

	@ApiProperty({ description: 'Current price' })
	currentPrice: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

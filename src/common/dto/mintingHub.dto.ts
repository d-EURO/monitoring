import { ApiProperty } from '@nestjs/swagger';

export interface MintingHubState {
	openingFee: number;
	challengerReward: number;
	expiredPriceFactor: number;
	positionFactory: string;
	deuro: string;
	positionRoller: string;
	rate: string;
}

export class MintingHubStateDto {
	@ApiProperty({ description: 'Opening fee for new positions' })
	openingFee: string;

	@ApiProperty({ description: 'Challenger reward percentage' })
	challengerReward: string;

	@ApiProperty({ description: 'Expired price factor' })
	expiredPriceFactor: number;

	@ApiProperty({ description: 'Position factory contract address' })
	positionFactory: string;

	@ApiProperty({ description: 'dEURO contract address' })
	deuro: string;

	@ApiProperty({ description: 'Position roller contract address' })
	positionRoller: string;

	@ApiProperty({ description: 'Interest rate' })
	rate: number;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

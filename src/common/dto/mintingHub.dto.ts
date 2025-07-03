import { ApiProperty } from '@nestjs/swagger';

export interface MintingHubState {
	openingFee: string;
	challengerReward: string;
	expiredPriceFactor: number;
}

export class MintingHubStateDto {
	@ApiProperty({ description: 'Opening fee for new positions' })
	openingFee: string;

	@ApiProperty({ description: 'Challenger reward percentage' })
	challengerReward: string;

	@ApiProperty({ description: 'Expired price factor' })
	expiredPriceFactor: number;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

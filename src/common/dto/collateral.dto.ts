import { ApiProperty } from '@nestjs/swagger';

export interface CollateralState {
	address: string;
	name: string;
	symbol: string;
	decimals: number;
}

export class CollateralStateDto {
	@ApiProperty({ description: 'Collateral token contract address' })
	address: string;

	@ApiProperty({ description: 'Token name' })
	name: string;

	@ApiProperty({ description: 'Token symbol (e.g., ETH, WBTC)' })
	symbol: string;

	@ApiProperty({ description: 'Token decimal places' })
	decimals: number;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

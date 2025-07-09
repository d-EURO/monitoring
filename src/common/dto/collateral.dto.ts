import { ApiProperty } from '@nestjs/swagger';

export interface CollateralState {
	tokenAddress: string;
	symbol: string;
	decimals: number;
	totalCollateral: bigint;
	positionCount: number;
}

export class CollateralStateDto {
	@ApiProperty({ description: 'Collateral token contract address' })
	tokenAddress: string;

	@ApiProperty({ description: 'Token symbol (e.g., ETH, WBTC)' })
	symbol: string;

	@ApiProperty({ description: 'Token decimal places' })
	decimals: number;

	@ApiProperty({ description: 'Total collateral amount locked' })
	totalCollateral: string;

	@ApiProperty({ description: 'Number of positions using this collateral' })
	positionCount: number;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

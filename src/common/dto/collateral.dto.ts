import { ApiProperty } from '@nestjs/swagger';

export interface CollateralState {
	tokenAddress: string;
	symbol: string;
	decimals: number;
	totalCollateral: string;
	positionCount: number;
	price: string;
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

	@ApiProperty({ description: 'Current price of the collateral token in smallest unit' })
	price: string;
}

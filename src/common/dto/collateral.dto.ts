import { ApiProperty } from '@nestjs/swagger';

export interface CollateralState {
	tokenAddress: string;
	symbol: string;
	decimals: number;
	totalCollateral: string;
	positionCount: number;
	totalLimit: string;
	totalAvailableForMinting: string;
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

	@ApiProperty({ description: 'Total limit across all unique original positions' })
	totalLimit: string;

	@ApiProperty({ description: 'Total available for minting across all unique original positions' })
	totalAvailableForMinting: string;

	@ApiProperty({ description: 'Current price of the collateral token in smallest unit' })
	price: string;
}

import { ApiProperty } from '@nestjs/swagger';

export interface EquityState {
	address: string;
	name: string;
	symbol: string;
	decimals: number;
	totalSupply: bigint;
	price: bigint;
	totalVotes: bigint;
	dEuroAddress: string;
	valuationFactor: number;
	minHoldingDuration: bigint;
}

export class EquityStateDto {
	@ApiProperty({ description: 'Contract address' })
	address: string;

	@ApiProperty({ description: 'Token name' })
	name: string;

	@ApiProperty({ description: 'Token symbol' })
	symbol: string;

	@ApiProperty({ description: 'Token decimal places' })
	decimals: number;

	@ApiProperty({ description: 'Total supply of equity tokens' })
	totalSupply: string;

	@ApiProperty({ description: 'Current equity price' })
	price: string;

	@ApiProperty({ description: 'Total votes cast' })
	totalVotes: string;

	@ApiProperty({ description: 'dEURO contract address' })
	dEuroAddress: string;

	@ApiProperty({ description: 'Valuation factor' })
	valuationFactor: number;

	@ApiProperty({ description: 'Minimum holding duration' })
	minHoldingDuration: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

import { ApiProperty } from '@nestjs/swagger';

export interface DecentralizedEuroState {
	address: string;
	name: string;
	symbol: string;
	decimals: number;
	totalSupply: bigint;
	reserveBalance: bigint;
	minterReserve: bigint;
	equity: bigint;
	equityAddress: string;
	minApplicationPeriod: bigint;
	minApplicationFee: bigint;
}

export class DeuroStateDto {
	@ApiProperty({ description: 'Contract address' })
	address: string;

	@ApiProperty({ description: 'Token name' })
	name: string;

	@ApiProperty({ description: 'Token symbol' })
	symbol: string;

	@ApiProperty({ description: 'Token decimal places' })
	decimals: number;

	@ApiProperty({ description: 'Total supply of dEURO tokens' })
	totalSupply: string;

	@ApiProperty({ description: 'Reserve balance' })
	reserveBalance: string;

	@ApiProperty({ description: 'Minter reserve balance' })
	minterReserve: string;

	@ApiProperty({ description: 'Equity value' })
	equity: string;

	@ApiProperty({ description: 'Equity contract address' })
	equityAddress: string;

	@ApiProperty({ description: 'Minimum application period' })
	minApplicationPeriod: string;

	@ApiProperty({ description: 'Minimum application fee' })
	minApplicationFee: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

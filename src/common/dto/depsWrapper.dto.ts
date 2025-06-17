import { ApiProperty } from '@nestjs/swagger';

export interface DEPSWrapperState {
	address: string;
	name: string;
	symbol: string;
	decimals: number;
	totalSupply: bigint;
	underlyingAddress: string;
	underlyingSymbol: string;
}

export class DepsStateDto {
	@ApiProperty({ description: 'Contract address' })
	address: string;

	@ApiProperty({ description: 'Token name' })
	name: string;

	@ApiProperty({ description: 'Token symbol' })
	symbol: string;

	@ApiProperty({ description: 'Token decimal places' })
	decimals: number;

	@ApiProperty({ description: 'Total supply of DEPS wrapper tokens' })
	totalSupply: string;

	@ApiProperty({ description: 'Address of underlying DEPS token' })
	underlyingAddress: string;

	@ApiProperty({ description: 'Symbol of underlying DEPS token' })
	underlyingSymbol: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

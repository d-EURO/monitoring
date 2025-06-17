import { ApiProperty } from '@nestjs/swagger';

export interface FrontendGatewayState {
	address: string;
	deuroAddress: string;
	equityAddress: string;
	depsAddress: string;
	mintingHubAddress: string;
	savingsAddress: string;
	feeRate: number;
	savingsFeeRate: number;
	mintingFeeRate: number;
	nextFeeRate: number;
	nextSavingsFeeRate: number;
	nextMintingFeeRate: number;
	changeTimeLock: bigint;
}

export class FrontendStateDto {
	@ApiProperty({ description: 'Contract address' })
	address: string;

	@ApiProperty({ description: 'dEURO contract address' })
	deuroAddress: string;

	@ApiProperty({ description: 'Equity contract address' })
	equityAddress: string;

	@ApiProperty({ description: 'DEPS contract address' })
	depsAddress: string;

	@ApiProperty({ description: 'Minting Hub contract address' })
	mintingHubAddress: string;

	@ApiProperty({ description: 'Savings contract address' })
	savingsAddress: string;

	@ApiProperty({ description: 'Current fee rate' })
	feeRate: number;

	@ApiProperty({ description: 'Current savings fee rate' })
	savingsFeeRate: number;

	@ApiProperty({ description: 'Current minting fee rate' })
	mintingFeeRate: number;

	@ApiProperty({ description: 'Next fee rate' })
	nextFeeRate: number;

	@ApiProperty({ description: 'Next savings fee rate' })
	nextSavingsFeeRate: number;

	@ApiProperty({ description: 'Next minting fee rate' })
	nextMintingFeeRate: number;

	@ApiProperty({ description: 'Change time lock duration' })
	changeTimeLock: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

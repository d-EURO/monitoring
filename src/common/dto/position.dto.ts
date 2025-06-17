import { ApiProperty } from '@nestjs/swagger';

export interface PositionState {
	address: string;
	owner: string;
	original: string;
	collateralAddress: string;
	collateralBalance: bigint;
	price: bigint;
	virtualPrice: bigint;
	expiredPurchasePrice: bigint;
	collateralRequirement: bigint;
	debt: bigint;
	interest: bigint;
	minimumCollateral: bigint;
	limit: bigint;
	principal: bigint;
	riskPremiumPPM: number;
	reserveContribution: number;
	fixedAnnualRatePPM: number;
	lastAccrual: bigint;
	start: bigint;
	cooldown: bigint;
	expiration: bigint;
	challengedAmount: bigint;
	challengePeriod: bigint;
	isClosed: boolean;
	created?: number;
}

export class PositionStateDto {
	@ApiProperty({ description: 'Position contract address' })
	address: string;

	@ApiProperty({ description: 'Position owner address' })
	owner: string;

	@ApiProperty({ description: 'Original position address' })
	original: string;

	@ApiProperty({ description: 'Collateral token address' })
	collateralAddress: string;

	@ApiProperty({ description: 'Collateral balance' })
	collateralBalance: string;

	@ApiProperty({ description: 'Position price' })
	price: string;

	@ApiProperty({ description: 'Virtual price' })
	virtualPrice: string;

	@ApiProperty({ description: 'Expired purchase price' })
	expiredPurchasePrice: string;

	@ApiProperty({ description: 'Collateral requirement' })
	collateralRequirement: string;

	@ApiProperty({ description: 'Position debt' })
	debt: string;

	@ApiProperty({ description: 'Interest accrued' })
	interest: string;

	@ApiProperty({ description: 'Minimum collateral required' })
	minimumCollateral: string;

	@ApiProperty({ description: 'Position limit' })
	limit: string;

	@ApiProperty({ description: 'Principal amount' })
	principal: string;

	@ApiProperty({ description: 'Risk premium in PPM' })
	riskPremiumPPM: number;

	@ApiProperty({ description: 'Reserve contribution' })
	reserveContribution: number;

	@ApiProperty({ description: 'Fixed annual rate in PPM' })
	fixedAnnualRatePPM: number;

	@ApiProperty({ description: 'Last accrual timestamp' })
	lastAccrual: string;

	@ApiProperty({ description: 'Position start timestamp' })
	start: string;

	@ApiProperty({ description: 'Cooldown period' })
	cooldown: string;

	@ApiProperty({ description: 'Position expiration' })
	expiration: string;

	@ApiProperty({ description: 'Amount being challenged' })
	challengedAmount: string;

	@ApiProperty({ description: 'Challenge period duration' })
	challengePeriod: string;

	@ApiProperty({ description: 'Whether position is closed' })
	isClosed: boolean;

	@ApiProperty({ description: 'Position creation time' })
	created?: number;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}

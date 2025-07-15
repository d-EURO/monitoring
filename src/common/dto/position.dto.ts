import { ApiProperty } from '@nestjs/swagger';

export enum PositionStatus {
	PROPOSED = 'PROPOSED',
	ACTIVE = 'ACTIVE',
	UNDERCOLLATERALIZED = 'UNDERCOLLATERALIZED',
	CHALLENGED = 'CHALLENGED',
	COOLDOWN = 'COOLDOWN',
	CLOSED = 'CLOSED',
	EXPIRING = 'EXPIRING',
	EXPIRED = 'EXPIRED',
}

export interface PositionState {
	address: string;
	status: PositionStatus;
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
	minimumChallengeAmount: bigint;
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
	availableForMinting: bigint;
	availableForClones: bigint;
	created?: number;
	marketPrice?: bigint;
	collateralizationRatio?: number;
}

export class PositionStateDto {
	@ApiProperty({ description: 'Position contract address' })
	address: string;

	@ApiProperty({ description: 'Position status', enum: PositionStatus })
	status: PositionStatus;

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

	@ApiProperty({ description: 'Minimum challenge amount' })
	minimumChallengeAmount: string;

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

	@ApiProperty({ description: 'Amount available for minting' })
	availableForMinting: string;

	@ApiProperty({ description: 'Amount available for cloning' })
	availableForClones: string;

	@ApiProperty({ description: 'Position creation time' })
	created?: number;

	@ApiProperty({ description: 'Market price of collateral token', required: false })
	marketPrice?: string;

	@ApiProperty({ description: 'Collateralization ratio (market price / virtual price)', required: false })
	collateralizationRatio?: number;
}

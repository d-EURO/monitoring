export interface Event {
	txHash: string;
	blockNumber: number;
	logIndex: number;
	contractAddress: string;
	topic: string;
	args: Record<string, any>;
	timestamp: Date;
}

export enum ContractType {
	DEURO = 'DEURO',
	EQUITY = 'EQUITY',
	DEPS = 'DEPS',
	SAVINGS = 'SAVINGS',
	POSITION = 'POSITION',
	MINTER = 'MINTER',
	BRIDGE = 'BRIDGE',
	FRONTEND_GATEWAY = 'FRONTEND_GATEWAY',
	MINTING_HUB = 'MINTING_HUB',
	ROLLER = 'ROLLER',
	COLLATERAL = 'COLLATERAL',
}

export interface Contract {
	address: string;
	type: ContractType;
	createdAtBlock: number;
	isActive?: boolean;
	metadata?: Record<string, any>;
}

export interface Token {
	address: string;
	symbol?: string;
	name?: string;
	decimals?: number;
	addedAt?: Date; // set by database
}

export interface PositionOpenedEvent {
	address: string;
	owner: string;
	original: string;
	collateral: string;
	timestamp: Date;
}

export interface MinterEntity {
	address: string;
	appliedAtBlock: number;
	applicationPeriod?: bigint;
	applicationFee?: bigint;
}

export interface ChallengeEntity {
	position: string;
	challenger: string;
	startedAtBlock: number;
	size?: bigint;
	liqPrice?: bigint;
}

export interface PositionState {
	// Fixed fields
	address: string;
	limit: bigint;
	owner: string;
	original: string;
	collateral: string;
	minimumCollateral: bigint;
	riskPremiumPpm: number;
	reserveContribution: number;
	challengePeriod: bigint;
	startTimestamp: bigint;
	expiration: bigint;
	created?: Date; // When position was opened

	// Dynamic fields
	price: bigint;
	virtualPrice: bigint;
	collateralAmount: bigint;
	expiredPurchasePrice: bigint;
	collateralRequirement: bigint;
	principal: bigint;
	interest: bigint;
	debt: bigint;
	fixedAnnualRatePpm: number;
	lastAccrual: bigint;
	cooldown: bigint;
	challengedAmount: bigint;
	availableForMinting: bigint;
	availableForClones: bigint;
	isClosed: boolean;

	// Metadata
	timestamp: Date;
}

export interface MinterState {
	address: string;
	applicationPeriod: bigint;
	applicationFee: bigint;
	message: string;
	isApproved: boolean;
	isDenied: boolean;
}

export interface ChallengeState {
	position: string;
	challenger: string;
	size: bigint;
	liqPrice: bigint;
	bid: bigint;
	end: bigint;
	status: 'ACTIVE' | 'SUCCEEDED' | 'AVERTED';
}

export interface MonitoringResult {
	processedBlocks: number;
	eventsCollected: number;
	entitiesDiscovered: {
		positions: number;
		minters: number;
		challenges: number;
	};
	statesFetched: {
		positions: number;
		minters: number;
		challenges: number;
	};
}
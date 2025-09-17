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

export interface PositionEntity {
	address: string;
	owner: string;
	original: string;
	collateral: string;
	openedAtBlock: number;
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
	address: string;
	owner: string;
	original: string;
	collateralAddress: string;
	collateralBalance: bigint;
	debt: bigint;
	interest: bigint;
	principal: bigint;
	price: bigint;
	expiration: bigint;
	cooldown: bigint;
	isClosed: boolean;
	challengedAmount: bigint;
	minimumCollateral: bigint;
	status: 'ACTIVE' | 'CLOSED' | 'EXPIRED' | 'CHALLENGED' | 'COOLDOWN';
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
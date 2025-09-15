export interface Event {
	txHash: string;
	blockNumber: number;
	logIndex: number;
	contractAddress: string;
	topic: string;
	args: Record<string, any>;
	timestamp: Date;
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
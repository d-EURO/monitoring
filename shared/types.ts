export enum PositionStatus {
	PROPOSED = 'PROPOSED',
	DENIED = 'DENIED',
	OPEN = 'OPEN',
	COOLDOWN = 'COOLDOWN',
	CHALLENGED = 'CHALLENGED',
	UNDERCOLLATERALIZED = 'UNDERCOLLATERALIZED',
	EXPIRED = 'EXPIRED',
	CLOSED = 'CLOSED',
}

export enum ChallengeStatus {
	AVERTING = 'AVERTING',
	AUCTION = 'AUCTION',
	ENDED = 'ENDED',
}

export enum MinterStatus {
	PROPOSED = 'PROPOSED',
	DENIED = 'DENIED',
	APPROVED = 'APPROVED',
	EXPIRED = 'EXPIRED',
}

export enum MinterType {
	MINTER = 'MINTER',
	BRIDGE = 'BRIDGE',
}

export enum HealthState {
	OK = 'OK',
	OFFLINE = 'OFFLINE',
	FAILING = 'FAILING',
}

export interface HealthResponse {
	status: HealthState;
	consecutiveFailures: number;
	lastProcessedBlock: number;
	currentBlock?: number;
	blocksBehind?: number;
	updatedAt: string; // Unix timestamp in milliseconds as string
}

export interface PositionResponse {
	address: string;
	status: PositionStatus;
	owner: string;
	original: string;
	collateral: string;
	collateralSymbol: string;
	collateralBalance: string;
	minimumCollateral: string;
	price: string;
	virtualPrice: string;
	expiredPurchasePrice: string;
	collateralRequirement: string;
	debt: string;
	interest: string;
	principal: string;
	limitAmount: string;
	availableForMinting: string;
	availableForClones: string;
	challengedAmount: string;
	riskPremiumPpm: number;
	reserveContribution: number;
	fixedAnnualRatePpm: number;
	start: string; // Unix timestamp in milliseconds as string
	cooldown: string; // Unix timestamp in milliseconds as string
	expiration: string; // Unix timestamp in milliseconds as string
	challengePeriod: string; // Duration in seconds as string (NOT a timestamp)
	isClosed: boolean;
	created: string; // Unix timestamp in milliseconds as string
	marketPrice: string;
	collateralizationRatio: string;
}

export interface ChallengeResponse {
	id: number;
	challenger: string;
	position: string;
	start: string; // Unix timestamp in milliseconds as string
	initialSize: string;
	size: string;
	currentPrice: string;
	status: ChallengeStatus;
	liquidationPrice: string;
	collateral: string;
	collateralSymbol: string;
	collateralBalance: string;
	challengePeriod: string; // Duration in seconds as string (NOT a timestamp)
}

// Frontend-specific types that don't come from API
export interface DeuroState {
	deuroTotalSupply: string;
	depsTotalSupply: string;
	equityShares: string;
	equityPrice: string;
	reserveTotal: string;
	reserveMinter: string;
	reserveEquity: string;
	deuroVolume24h: string;
	deuroTransferCount24h: number;
	deuroUniqueAddresses24h: number;
	depsVolume24h: string;
	depsTransferCount24h: number;
	depsUniqueAddresses24h: number;
	equityTradeVolume24h: string;
	equityTradeCount24h: number;
	equityDelegations24h: number;
	deuroLoss: string;
	deuroProfit: string;
	deuroProfitDistributed: string;
	savingsTotal: string;
	savingsRate: string;
	savingsAdded24h: string;
	savingsWithdrawn24h: string;
	savingsInterestCollected24h: string;
	deuroMinted24h: string;
	deuroBurned24h: string;
	savingsInterestCollected: string;
	frontendFeesCollected: string;
	frontendsActive: number;
	usdToEurRate?: number;
	usdToChfRate?: number;
}

export interface CollateralResponse {
	collateral: string;
	symbol: string;
	price: string;
	totalCollateral: string;
	totalLimit: string;
	totalAvailableForMinting: string;
	positionCount: number;
	updatedAt: string; // Unix timestamp in milliseconds as string
}

export interface MinterResponse {
	address: string;
	type: MinterType;
	status: MinterStatus;
	applicationTimestamp: string; // Unix timestamp in milliseconds as string
	applicationPeriod: string; // Duration in seconds as string (NOT a timestamp)
	applicationFee: string;
	message: string;

	bridgeToken?: string;
	bridgeTokenSymbol?: string;
	bridgeLimit?: string;
	bridgeMinted?: string;
	bridgeHorizon?: string; // Unix timestamp in milliseconds as string
}
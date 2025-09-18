export enum PositionStatus {
	ACTIVE = 'ACTIVE',
	CLOSED = 'CLOSED',
	CHALLENGED = 'CHALLENGED',
	COOLDOWN = 'COOLDOWN',
	EXPIRED = 'EXPIRED',
}

export enum ChallengeStatus {
	AVERTING = 'AVERTING',
	AUCTION = 'AUCTION',
	ENDED = 'ENDED',
}

export interface HealthResponse {
	status: string;
	lastProcessedBlock: number;
	updatedAt?: string;
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
	start: string;
	cooldown: string;
	expiration: string;
	challengePeriod: string;
	isClosed: boolean;
	created: string;
	marketPrice: string;
	collateralizationRatio: string;
}

export interface ChallengeResponse {
	id: number;
	challenger: string;
	position: string;
	start: number;
	initialSize: string;
	size: string;
	currentPrice: string;
	status: ChallengeStatus;
	liquidationPrice: string;
	collateral: string;
	collateralSymbol: string;
	collateralBalance: string;
	challengePeriod: string;
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

export interface Collateral {
	tokenAddress: string;
	symbol: string;
	decimals: number;
	totalCollateral: string;
	positionCount: number;
	totalLimit: string;
	totalAvailableForMinting: string;
	price: string;
}

export interface Minter {
	minter: string;
	status: 'PENDING' | 'APPROVED' | 'DENIED';
	applicationDate: string;
	applicationPeriod: string;
	applicationFee: string;
	message: string;
	denialDate: string | null;
	denialMessage: string | null;
}

export interface Bridge {
	address: string;
	eurAddress: string;
	eurSymbol: string;
	eurDecimals: number;
	dEuroAddress: string;
	limit: string;
	minted: string;
	horizon: string;
}

// Type aliases for frontend compatibility
export type Position = PositionResponse;
export type Challenge = ChallengeResponse;
export type HealthStatus = HealthResponse;
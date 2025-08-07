import { MonitoringStatus } from './monitoring';

// API Response Types
export interface HealthStatus {
  lastProcessedBlock: number | null;
  currentBlock: number;
  blockLag: number;
  monitoringStatus: MonitoringStatus;
  syncProgress: number;
  lastError?: string;
  timestamp: string;
}

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

export interface Position {
  address: string;
  status: 'ACTIVE' | 'CLOSED' | 'CHALLENGED' | 'COOLDOWN' | 'EXPIRED';
  owner: string;
  original: string;
  collateralAddress: string;
  collateralBalance: string;
  price: string;
  virtualPrice: string;
  expiredPurchasePrice: string;
  collateralRequirement: string;
  debt: string;
  interest: string;
  minimumCollateral: string;
  minimumChallengeAmount: string;
  limit: string;
  principal: string;
  riskPremiumPPM: number;
  reserveContribution: number;
  fixedAnnualRatePPM: number;
  lastAccrual: string;
  start: string;
  cooldown: string;
  expiration: string;
  challengedAmount: string;
  challengePeriod: string;
  isClosed: boolean;
  availableForMinting: string;
  availableForClones: string;
  created?: number;
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

export interface Challenge {
  id: number;
  challenger: string;
  position: string;
  positionOwner: string;
  start: number;
  initialSize: string;
  size: string;
  collateralAddress: string;
  liqPrice: string;
  phase: number;
  status: 'OPENED' | 'PARTIALLY_AVERTED' | 'AVERTED' | 'AUCTION' | 'PARTIALLY_SUCCEEDED' | 'SUCCEEDED';
  currentPrice: string;
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
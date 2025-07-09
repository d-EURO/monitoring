// Database record types that match PostgreSQL column names exactly

// Transfer Events
export interface DeuroTransferEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	from_address: string;
	to_address: string;
	value: string;
}

export interface DepsTransferEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	from_address: string;
	to_address: string;
	value: string;
}

// dEURO Events
export interface DeuroMinterAppliedRecord {
	minter: string;
	timestamp: Date;
	application_period: string;
	application_fee: string;
	message: string;
}

export interface DeuroMinterDeniedRecord {
	minter: string;
	timestamp: Date;
	message: string;
}

export interface DeuroLossEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	reporting_minter: string;
	amount: string;
}

export interface DeuroProfitEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	reporting_minter: string;
	amount: string;
}

export interface DeuroProfitDistributedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	recipient: string;
	amount: string;
}

// Equity Events
export interface EquityTradeEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	who: string;
	amount: string;
	tot_price: string;
	new_price: string;
}

export interface EquityDelegationEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	from_address: string;
	to_address: string;
}

// Savings Events
export interface SavingsSavedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	account: string;
	amount: string;
}

export interface SavingsInterestCollectedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	account: string;
	interest: string;
}

export interface SavingsWithdrawnEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	account: string;
	amount: string;
}

export interface SavingsRateProposedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	who: string;
	next_rate: string;
	next_change: string;
}

export interface SavingsRateChangedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	new_rate: string;
}

// MintingHub Events
export interface MintingHubPositionOpenedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	owner: string;
	position: string;
	original: string;
	collateral: string;
}

export interface MintingHubChallengeStartedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	challenger: string;
	position: string;
	size: string;
	number: string;
}

export interface MintingHubChallengeAvertedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	position: string;
	number: string;
	size: string;
}

export interface MintingHubChallengeSucceededEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	position: string;
	number: string;
	bid: string;
	acquired_collateral: string;
	challenge_size: string;
}

export interface MintingHubPostponedReturnEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	collateral: string;
	beneficiary: string;
	amount: string;
}

export interface MintingHubForcedSaleEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	pos: string;
	amount: string;
	price_e36_minus_decimals: string;
}

// Roller Events
export interface RollerRollEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	source: string;
	coll_withdraw: string;
	repay: string;
	target: string;
	coll_deposit: string;
	mint: string;
}

// Position Events
export interface PositionDeniedEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	position: string;
	sender: string;
	message: string;
}

export interface PositionMintingUpdateEventRecord {
	tx_hash: string;
	timestamp: Date;
	log_index: number;
	position: string;
	collateral: string;
	price: string;
	principal: string;
}

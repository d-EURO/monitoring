// Database record types that match PostgreSQL column names exactly
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

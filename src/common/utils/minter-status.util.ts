import { MinterStatus } from '../dto/minter.dto';

export function calculateMinterStatus(
	applicationTimestamp: Date,
	applicationPeriod: string | bigint,
	denialTimestamp?: Date
): MinterStatus {
	// If denied after application, status is DENIED
	if (denialTimestamp && denialTimestamp > applicationTimestamp) {
		return MinterStatus.DENIED;
	}

	// Calculate if application period has expired
	const now = Date.now();
	const applicationEndTime = new Date(applicationTimestamp).getTime() + Number(applicationPeriod) * 1000;
	
	// If still within application period, status is PENDING
	if (now < applicationEndTime) {
		return MinterStatus.PENDING;
	}
	
	// Otherwise, status is APPROVED
	return MinterStatus.APPROVED;
}
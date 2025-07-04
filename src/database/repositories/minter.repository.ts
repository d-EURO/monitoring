import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { DeuroMinterAppliedRecord, DeuroMinterDeniedRecord } from '../types/event-records';

@Injectable()
export class MinterRepository {
	constructor(private readonly db: DatabaseService) {}

	async getLatestApplications(): Promise<DeuroMinterAppliedRecord[]> {
		return this.db.fetch<DeuroMinterAppliedRecord>(`
			SELECT minter, timestamp, application_period, application_fee, message
			FROM deuro_minter_applied_events e1
			WHERE timestamp = (
				SELECT MAX(timestamp) 
				FROM deuro_minter_applied_events e2 
				WHERE e2.minter = e1.minter
			)
			ORDER BY timestamp DESC
		`);
	}

	async getLatestDenials(): Promise<DeuroMinterDeniedRecord[]> {
		return this.db.fetch<DeuroMinterDeniedRecord>(`
			SELECT minter, timestamp, message
			FROM deuro_minter_denied_events d1
			WHERE timestamp = (
				SELECT MAX(timestamp) 
				FROM deuro_minter_denied_events d2 
				WHERE d2.minter = d1.minter
			)
		`);
	}
}

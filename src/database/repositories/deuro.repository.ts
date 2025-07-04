import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { SystemStateRecord } from '../types';

@Injectable()
export class DeuroRepository {
	constructor(private readonly db: DatabaseService) {}

	async getLatestState(): Promise<SystemStateRecord | null> {
		const results = await this.db.fetch<SystemStateRecord>(`
			SELECT * FROM system_state 
			ORDER BY block_number DESC 
			LIMIT 1
		`);
		return results[0] || null;
	}

	async getHistoricalStates(limit: number = 100): Promise<SystemStateRecord[]> {
		return this.db.fetch<SystemStateRecord>(
			`
			SELECT * FROM system_state 
			ORDER BY block_number DESC 
			LIMIT $1
		`,
			[limit]
		);
	}
}
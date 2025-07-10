import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { DeuroMinterAppliedRecord, DeuroMinterDeniedRecord } from '../types/event-records';
import { MinterState, MinterStateDto, MinterStatus } from 'src/common/dto';
import { MinterStateRecord } from '../types';

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

	async getTotalMintedByMinter(minter: string): Promise<bigint> {
		const results = await this.db.fetch<{ total_minted: string }>(
			`
			SELECT COALESCE(SUM(value), '0') as total_minted
			FROM deuro_transfer_events
			WHERE to_address = $1 AND from_address = '0x0000000000000000000000000000000000000000'
		`,
			[minter]
		);
		return BigInt(results[0].total_minted);
	}

	async getTotalBurnedByMinter(minter: string): Promise<bigint> {
		const results = await this.db.fetch<{ total_burned: string }>(
			`
			SELECT COALESCE(SUM(value), '0') as total_burned
			FROM deuro_transfer_events
			WHERE from_address = $1 AND to_address = '0x0000000000000000000000000000000000000000'
		`,
			[minter]
		);
		return BigInt(results[0].total_burned);
	}

	async getAllMinterStates(): Promise<MinterStateDto[]> {
		const records = await this.db.fetch<MinterStateRecord>(`
			SELECT * FROM minter_states 
			ORDER BY minter
		`);
		return records.map(this.mapToDto);
	}


	async saveMinterStates(client: any, minters: MinterState[], blockNumber: number): Promise<void> {
		if (minters.length === 0) return;

		const timestamp = new Date();
		for (const minter of minters) {
			const query = `
				INSERT INTO minter_states (
					block_number, timestamp, minter, status, application_date, application_period,
					application_fee, message, denial_date, denial_message, deuro_minted, deuro_burned
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				ON CONFLICT (minter) DO UPDATE SET
					block_number = EXCLUDED.block_number,
					timestamp = EXCLUDED.timestamp,
					status = EXCLUDED.status,
					application_date = EXCLUDED.application_date,
					application_period = EXCLUDED.application_period,
					application_fee = EXCLUDED.application_fee,
					message = EXCLUDED.message,
					denial_date = EXCLUDED.denial_date,
					denial_message = EXCLUDED.denial_message,
					deuro_minted = EXCLUDED.deuro_minted,
					deuro_burned = EXCLUDED.deuro_burned
			`;

			await client.query(query, [
				blockNumber,
				timestamp,
				minter.minter,
				minter.status,
				minter.applicationDate,
				minter.applicationPeriod.toString(),
				minter.applicationFee.toString(),
				minter.message || null,
				minter.denialDate || null,
				minter.denialMessage || null,
				minter.deuroMinted?.toString() || '0',
				minter.deuroBurned?.toString() || '0',
			]);
		}
	}

	private mapToDto(record: MinterStateRecord): MinterStateDto {
		return {
			minter: record.minter,
			status: record.status as MinterStatus,
			applicationDate: record.application_date,
			applicationPeriod: record.application_period,
			applicationFee: record.application_fee,
			message: record.message,
			denialDate: record.denial_date ? new Date(record.denial_date) : null,
			denialMessage: record.denial_message,
			deuroMinted: record.deuro_minted,
			deuroBurned: record.deuro_burned,
		}
	}
}

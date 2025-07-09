import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { ChallengeState, ChallengeStateDto, ChallengeStatus } from '../../common/dto/challenge.dto';
import { ChallengeRecord } from '../types';

@Injectable()
export class ChallengeRepository {
	constructor(private readonly db: DatabaseService) {}

	async getAllChallenges(): Promise<ChallengeStateDto[]> {
		const records = await this.db.fetch<ChallengeRecord>(`
			SELECT * FROM challenge_states 
			ORDER BY challenge_id
		`);
		return records.map(this.mapToDto);
	}

	async getOpenChallenges(): Promise<ChallengeStateDto[]> {
		const records = await this.db.fetch<ChallengeRecord>(`
			SELECT * FROM challenge_states 
			WHERE status NOT IN ('AVERTED', 'SUCCEEDED')
			ORDER BY challenge_id
		`);
		return records.map(this.mapToDto);
	}

	// Write operations
	async saveChallenges(client: any, challenges: ChallengeState[], blockNumber: number): Promise<void> {
		const timestamp = new Date();
		for (const challenge of challenges) {
			const query = `
					INSERT INTO challenge_states (
						block_number, timestamp, challenge_id, challenger_address, position_address,
						position_owner_address, start_timestamp, initial_size, size,
						collateral_address, liq_price, phase, status, current_price
					)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
					ON CONFLICT (challenge_id) DO UPDATE SET
						block_number = EXCLUDED.block_number,
						timestamp = EXCLUDED.timestamp,
						challenger_address = EXCLUDED.challenger_address,
						position_address = EXCLUDED.position_address,
						position_owner_address = EXCLUDED.position_owner_address,
						start_timestamp = EXCLUDED.start_timestamp,
						initial_size = EXCLUDED.initial_size,
						size = EXCLUDED.size,
						collateral_address = EXCLUDED.collateral_address,
						liq_price = EXCLUDED.liq_price,
						phase = EXCLUDED.phase,
						status = EXCLUDED.status,
						current_price = EXCLUDED.current_price
				`;

			await client.query(query, [
				blockNumber,
				timestamp,
				challenge.id,
				challenge.challenger,
				challenge.position,
				challenge.positionOwner,
				challenge.start,
				challenge.initialSize.toString(),
				challenge.size,
				challenge.collateralAddress,
				challenge.liqPrice,
				challenge.phase,
				challenge.status,
				challenge.currentPrice,
			]);
		}
	}

	// Mapping function
	private mapToDto(record: ChallengeRecord): ChallengeStateDto {
		return {
			id: record.challenge_id,
			challenger: record.challenger_address,
			position: record.position_address,
			positionOwner: record.position_owner_address,
			start: record.start_timestamp,
			initialSize: record.initial_size,
			size: record.size,
			collateralAddress: record.collateral_address,
			liqPrice: record.liq_price,
			phase: record.phase,
			status: record.status as ChallengeStatus,
			currentPrice: record.current_price,
			block_number: parseInt(record.block_number),
			timestamp: record.timestamp,
		};
	}
}

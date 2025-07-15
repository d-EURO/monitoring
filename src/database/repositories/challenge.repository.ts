import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { ChallengeState, ChallengeStatus } from '../../common/dto/challenge.dto';
import { ChallengeRecord, MintingHubChallengeStartedEventRecord, MintingHubChallengeSucceededEventRecord } from '../types';

@Injectable()
export class ChallengeRepository {
	constructor(private readonly db: DatabaseService) {}

	async getAllChallenges(): Promise<ChallengeState[]> {
		const records = await this.db.fetch<ChallengeRecord>(`
			SELECT * FROM challenge_states 
			ORDER BY challenge_id
		`);
		return records.map(this.mapToDomain);
	}

	async getOpenChallenges(): Promise<ChallengeState[]> {
		const records = await this.db.fetch<ChallengeRecord>(`
			SELECT * FROM challenge_states 
			WHERE status NOT IN ('AVERTED', 'SUCCEEDED')
			ORDER BY challenge_id
		`);
		return records.map(this.mapToDomain);
	}

	// Helper methods for updating challenges
	async getChallengeById(challengeId: number): Promise<ChallengeState | null> {
		const records = await this.db.fetch<ChallengeRecord>(
			`
          SELECT * FROM challenge_states 
          WHERE challenge_id = $1
          LIMIT 1`,
			[challengeId]
		);
		return records.length > 0 ? this.mapToDomain(records[0]) : null;
	}

	async getMaxChallengeId(): Promise<number> {
		const result = await this.db.fetch<{ max_id: string | null }>(`
          SELECT MAX(challenge_id) as max_id FROM challenge_states
      `);
		return result[0].max_id ? parseInt(result[0].max_id, 10) : 0;
	}

	async getActiveChallengeStartedEvents(): Promise<MintingHubChallengeStartedEventRecord[]> {
		const records = await this.db.fetch<MintingHubChallengeStartedEventRecord>(`
			SELECT * FROM mintinghub_challenge_started_events
			WHERE number NOT IN (
				SELECT challenge_id FROM challenge_states
				WHERE status IN ('AVERTED', 'SUCCEEDED')
			) 
		`);
		return records.map(this.mapToChallengeStartedDto);
	}

	async getAcquiredCollateralByChallengeId(challengeId: number): Promise<string> {
		const result = await this.db.fetch<{ total_bid: string }>(
			`
		  SELECT SUM(acquired_collateral) AS total_bid
		  FROM mintinghub_challenge_succeeded_events
		  WHERE number = $1
	  `,
			[challengeId]
		);
		return result.length > 0 && result[0].total_bid ? result[0].total_bid : '0';
	}

	async getAvertedAmountByChallengeId(challengeId: number): Promise<string> {
		const result = await this.db.fetch<{ total_averted: string }>(
			`
			SELECT SUM(size) AS total_averted
			FROM mintinghub_challenge_averted_events
			WHERE number = $1
		`,
			[challengeId]
		);
		return result.length > 0 && result[0].total_averted ? result[0].total_averted : '0';
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
	private mapToDomain(record: ChallengeRecord): ChallengeState {
		return {
			id: record.challenge_id,
			challenger: record.challenger_address,
			position: record.position_address,
			positionOwner: record.position_owner_address,
			start: record.start_timestamp,
			initialSize: BigInt(record.initial_size),
			size: record.size,
			collateralAddress: record.collateral_address,
			liqPrice: record.liq_price,
			phase: record.phase,
			status: record.status as ChallengeStatus,
			currentPrice: record.current_price,
		};
	}

	private mapToChallengeStartedDto(record: MintingHubChallengeStartedEventRecord): MintingHubChallengeStartedEventRecord {
		return {
			tx_hash: record.tx_hash,
			timestamp: record.timestamp,
			log_index: record.log_index,
			challenger: record.challenger,
			position: record.position,
			size: record.size.toString(),
			number: record.number.toString(),
		};
	}
}

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { PositionState, PositionStatus } from '../../common/dto/position.dto';
import { PositionStateRecord } from '../types';

@Injectable()
export class PositionRepository {
	constructor(private readonly db: DatabaseService) {}

	// Read operations
	async getAllPositions(): Promise<PositionState[]> {
		const records = await this.db.fetch<PositionStateRecord>(`
			SELECT * FROM position_states 
			ORDER BY position_address
		`);
		return records.map(this.mapToDomain);
	}

	async getLivePositions(): Promise<PositionState[]> {
		const records = await this.db.fetch<PositionStateRecord>(`
			SELECT * FROM position_states 
			WHERE is_closed = false 
			ORDER BY position_address
		`);
		return records.map(this.mapToDomain);
	}

	async getActivePositionAddresses(filters?: {
		owner?: string;
		collateral?: string;
		original?: string;
		limit?: number;
	}): Promise<string[]> {
		let query = `
      SELECT DISTINCT position 
      FROM mintinghub_position_opened_events
    `;
		const params: any[] = [];
		const whereConditions: string[] = [];

		if (filters?.owner) {
			whereConditions.push(`owner = $${params.length + 1}`);
			params.push(filters.owner);
		}

		if (filters?.collateral) {
			whereConditions.push(`collateral = $${params.length + 1}`);
			params.push(filters.collateral);
		}

		if (filters?.original) {
			whereConditions.push(`original = $${params.length + 1}`);
			params.push(filters.original);
		}

		if (whereConditions.length > 0) {
			query += ` WHERE ` + whereConditions.join(' AND ');
		}

		query += ` ORDER BY position`;

		if (filters?.limit) {
			query += ` LIMIT $${params.length + 1}`;
			params.push(filters.limit);
		}

		const rows = await this.db.fetch<{ position: string }>(query, params);
		return rows.map((row) => row.position);
	}

	async getPositionsByCollateral(collateralAddress: string): Promise<PositionState[]> {
		const records = await this.db.fetch<PositionStateRecord>(
			`
			SELECT * FROM position_states 
			WHERE collateral_address = $1 
			ORDER BY position_address
		`,
			[collateralAddress.toLowerCase()]
		);
		return records.map(this.mapToDomain);
	}

	async getPositionOpenedTimestamp(address: string): Promise<number | null> {
		const records = await this.db.fetch<{ timestamp: Date }>(
			`
			SELECT timestamp 
			FROM mintinghub_position_opened_events 
			WHERE LOWER(position) = LOWER($1) 
			ORDER BY timestamp DESC 
			LIMIT 1
		`,
			[address]
		);

		return records.length > 0 ? Math.floor(records[0].timestamp.getTime() / 1000) : null;
	}

	// Write operations
	async savePositionStates(client: any, positions: PositionState[], blockNumber: number): Promise<void> {
		const timestamp = new Date();
		for (const position of positions) {
			const query = `
					INSERT INTO position_states (
						block_number, timestamp, position_address, status, owner_address,
						original_address, collateral_address, collateral_balance, price,
						virtual_price, expired_purchase_price, collateral_requirement,
						debt, interest, minimum_collateral, minimum_challenge_amount,
						limit_amount, principal, risk_premium_ppm, reserve_contribution,
						fixed_annual_rate_ppm, last_accrual, start_timestamp, cooldown_period,
						expiration_timestamp, challenged_amount, challenge_period, is_closed,
						available_for_minting, available_for_clones, created, market_price, collateralization_ratio
					)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
					ON CONFLICT (position_address) DO UPDATE SET
						block_number = EXCLUDED.block_number,
						timestamp = EXCLUDED.timestamp,
						status = EXCLUDED.status,
						owner_address = EXCLUDED.owner_address,
						collateral_balance = EXCLUDED.collateral_balance,
						price = EXCLUDED.price,
						virtual_price = EXCLUDED.virtual_price,
						expired_purchase_price = EXCLUDED.expired_purchase_price,
						collateral_requirement = EXCLUDED.collateral_requirement,
						debt = EXCLUDED.debt,
						interest = EXCLUDED.interest,
						minimum_collateral = EXCLUDED.minimum_collateral,
						minimum_challenge_amount = EXCLUDED.minimum_challenge_amount,
						limit_amount = EXCLUDED.limit_amount,
						principal = EXCLUDED.principal,
						last_accrual = EXCLUDED.last_accrual,
						start_timestamp = EXCLUDED.start_timestamp,
						cooldown_period = EXCLUDED.cooldown_period,
						expiration_timestamp = EXCLUDED.expiration_timestamp,
						challenged_amount = EXCLUDED.challenged_amount,
						challenge_period = EXCLUDED.challenge_period,
						is_closed = EXCLUDED.is_closed,
						available_for_minting = EXCLUDED.available_for_minting,
						available_for_clones = EXCLUDED.available_for_clones,
						market_price = EXCLUDED.market_price,
						collateralization_ratio = EXCLUDED.collateralization_ratio
				`;

			await client.query(query, [
				blockNumber,
				timestamp,
				position.address,
				position.status,
				position.owner,
				position.original,
				position.collateralAddress,
				position.collateralBalance.toString(),
				position.price.toString(),
				position.virtualPrice.toString(),
				position.expiredPurchasePrice.toString(),
				position.collateralRequirement.toString(),
				position.debt.toString(),
				position.interest.toString(),
				position.minimumCollateral.toString(),
				position.minimumChallengeAmount.toString(),
				position.limit.toString(),
				position.principal.toString(),
				position.riskPremiumPPM,
				position.reserveContribution,
				position.fixedAnnualRatePPM,
				position.lastAccrual.toString(),
				position.start.toString(),
				position.cooldown.toString(),
				position.expiration.toString(),
				position.challengedAmount.toString(),
				position.challengePeriod.toString(),
				position.isClosed,
				position.availableForMinting.toString(),
				position.availableForClones.toString(),
				position.created || null,
				position.marketPrice ? position.marketPrice.toString() : null,
				position.collateralizationRatio || null,
			]);
		}
	}

	// Mapping functions
	private mapToDomain(record: PositionStateRecord): PositionState {
		return {
			address: record.position_address,
			status: record.status as PositionStatus,
			owner: record.owner_address,
			original: record.original_address,
			collateralAddress: record.collateral_address,
			collateralBalance: BigInt(record.collateral_balance),
			price: BigInt(record.price),
			virtualPrice: BigInt(record.virtual_price),
			expiredPurchasePrice: BigInt(record.expired_purchase_price),
			collateralRequirement: BigInt(record.collateral_requirement),
			debt: BigInt(record.debt),
			interest: BigInt(record.interest),
			minimumCollateral: BigInt(record.minimum_collateral),
			minimumChallengeAmount: BigInt(record.minimum_challenge_amount),
			limit: BigInt(record.limit_amount),
			principal: BigInt(record.principal),
			riskPremiumPPM: record.risk_premium_ppm,
			reserveContribution: record.reserve_contribution,
			fixedAnnualRatePPM: record.fixed_annual_rate_ppm,
			lastAccrual: BigInt(record.last_accrual),
			start: BigInt(record.start_timestamp),
			cooldown: BigInt(record.cooldown_period),
			expiration: BigInt(record.expiration_timestamp),
			challengedAmount: BigInt(record.challenged_amount),
			challengePeriod: BigInt(record.challenge_period),
			isClosed: record.is_closed,
			availableForMinting: BigInt(record.available_for_minting),
			availableForClones: BigInt(record.available_for_clones),
			created: record.created,
			marketPrice: record.market_price ? BigInt(record.market_price) : undefined,
			collateralizationRatio: record.collateralization_ratio ? parseFloat(record.collateralization_ratio) : undefined,
		};
	}
}

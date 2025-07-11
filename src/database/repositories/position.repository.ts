import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { PositionStateDto, PositionState, PositionStatus } from '../../common/dto/position.dto';
import { PositionStateRecord } from '../types';

@Injectable()
export class PositionRepository {
	constructor(private readonly db: DatabaseService) {}

	// Read operations
	async getAllPositions(): Promise<PositionStateDto[]> {
		const records = await this.db.fetch<PositionStateRecord>(`
			SELECT * FROM position_states 
			ORDER BY position_address
		`);
		return records.map(this.mapToDto);
	}

	async getLivePositions(): Promise<PositionStateDto[]> {
		const records = await this.db.fetch<PositionStateRecord>(`
			SELECT * FROM position_states 
			WHERE is_closed = false 
			ORDER BY position_address
		`);
		return records.map(this.mapToDto);
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

	async getPositionsByCollateral(collateralAddress: string): Promise<PositionStateDto[]> {
		const records = await this.db.fetch<PositionStateRecord>(
			`
			SELECT * FROM position_states 
			WHERE collateral_address = $1 
			ORDER BY position_address
		`,
			[collateralAddress.toLowerCase()]
		);
		return records.map(this.mapToDto);
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
						available_for_minting, available_for_clones
					)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
					ON CONFLICT (position_address) DO UPDATE SET
						block_number = EXCLUDED.block_number,
						timestamp = EXCLUDED.timestamp,
						status = EXCLUDED.status,
						owner_address = EXCLUDED.owner_address,
						collateral_balance = EXCLUDED.collateral_balance,
						price = EXCLUDED.price,
						virtual_price = EXCLUDED.virtual_price,
						debt = EXCLUDED.debt,
						interest = EXCLUDED.interest,
						challenged_amount = EXCLUDED.challenged_amount,
						is_closed = EXCLUDED.is_closed,
						available_for_minting = EXCLUDED.available_for_minting,
						available_for_clones = EXCLUDED.available_for_clones
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
			]);
		}
	}

	// Mapping function
	private mapToDto(record: PositionStateRecord): PositionStateDto {
		return {
			address: record.position_address,
			status: record.status as PositionStatus,
			owner: record.owner_address,
			original: record.original_address,
			collateralAddress: record.collateral_address,
			collateralBalance: record.collateral_balance,
			price: record.price,
			virtualPrice: record.virtual_price,
			expiredPurchasePrice: record.expired_purchase_price,
			collateralRequirement: record.collateral_requirement,
			debt: record.debt,
			interest: record.interest,
			minimumCollateral: record.minimum_collateral,
			minimumChallengeAmount: record.minimum_challenge_amount,
			limit: record.limit_amount,
			principal: record.principal,
			riskPremiumPPM: record.risk_premium_ppm,
			reserveContribution: record.reserve_contribution,
			fixedAnnualRatePPM: record.fixed_annual_rate_ppm,
			lastAccrual: record.last_accrual,
			start: record.start_timestamp,
			cooldown: record.cooldown_period,
			expiration: record.expiration_timestamp,
			challengedAmount: record.challenged_amount,
			challengePeriod: record.challenge_period,
			isClosed: record.is_closed,
			availableForMinting: record.available_for_minting,
			availableForClones: record.available_for_clones,
			created: parseInt(record.block_number),
			block_number: parseInt(record.block_number),
			timestamp: record.timestamp,
		};
	}
}

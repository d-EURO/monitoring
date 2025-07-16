import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { CollateralState } from '../../common/dto';
import { CollateralStateRecord } from '../types/state-records';

@Injectable()
export class CollateralRepository {
	constructor(private readonly db: DatabaseService) {}

	// Read operations
	async getAllCollateralStates(): Promise<CollateralState[]> {
		const records = await this.db.fetch<CollateralStateRecord>(`
			SELECT * FROM collateral_states 
			ORDER BY token_address
		`);
		return records.map(this.mapToDomain);
	}

	// Write operations
	async saveCollateralStates(client: any, collaterals: CollateralState[], blockNumber: number): Promise<void> {
		const timestamp = new Date();
		for (const collateral of collaterals) {
			const query = `
				INSERT INTO collateral_states (
					block_number, timestamp, token_address, symbol, decimals, 
					total_collateral, position_count, total_limit, 
					total_available_for_minting, price
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				ON CONFLICT (token_address) DO UPDATE SET
					block_number = EXCLUDED.block_number,
					timestamp = EXCLUDED.timestamp,
					symbol = EXCLUDED.symbol,
					decimals = EXCLUDED.decimals,
					total_collateral = EXCLUDED.total_collateral,
					position_count = EXCLUDED.position_count,
					total_limit = EXCLUDED.total_limit,
					total_available_for_minting = EXCLUDED.total_available_for_minting,
					price = EXCLUDED.price
			`;

			await client.query(query, [
				blockNumber,
				timestamp,
				collateral.tokenAddress,
				collateral.symbol,
				collateral.decimals,
				collateral.totalCollateral.toString(),
				collateral.positionCount,
				collateral.totalLimit.toString(),
				collateral.totalAvailableForMinting.toString(),
				collateral.price,
			]);
		}
	}

	// Mapping function
	private mapToDomain(record: CollateralStateRecord): CollateralState {
		return {
			tokenAddress: record.token_address,
			symbol: record.symbol,
			decimals: record.decimals,
			totalCollateral: record.total_collateral,
			positionCount: record.position_count,
			totalLimit: record.total_limit,
			totalAvailableForMinting: record.total_available_for_minting,
			price: record.price ? record.price.toString() : '0',
		};
	}
}

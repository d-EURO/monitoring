import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { PositionState, CollateralState, CollateralStateDto } from '../../common/dto';
import { CollateralStateRecord } from '../types/db-records';

@Injectable()
export class CollateralRepository {
	constructor(private readonly db: DatabaseService) {}

	// Read operations
	async getAllCollateralStates(): Promise<CollateralStateDto[]> {
		const records = await this.db.fetch<CollateralStateRecord>(`
			SELECT * FROM collateral_states 
			WHERE block_number = (SELECT MAX(block_number) FROM collateral_states)
			ORDER BY token_address
		`);
		return records.map(this.mapToDto);
	}

	// Write operations
	async persistCollateralStates(
		client: any,
		blockNumber: number,
		timestamp: Date,
		collaterals: CollateralState[],
		positions: PositionState[] = []
	): Promise<void> {
		for (const collateral of collaterals) {
			const query = `
				INSERT INTO collateral_states (
					block_number, timestamp, token_address, symbol, decimals, total_collateral, position_count
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (block_number, token_address) DO UPDATE SET
					timestamp = EXCLUDED.timestamp,
					symbol = EXCLUDED.symbol,
					decimals = EXCLUDED.decimals,
					total_collateral = EXCLUDED.total_collateral,
					position_count = EXCLUDED.position_count
			`;

			// Calculate totals from position data for this specific collateral
			const collateralPositions = positions.filter(
				(p) => p.collateralAddress.toLowerCase() === collateral.tokenAddress.toLowerCase() && !p.isClosed
			);
			const positionCount = collateralPositions.length;
			let totalCollateral = BigInt(0);

			for (const position of collateralPositions) {
				totalCollateral += BigInt(position.collateralBalance || 0);
			}

			await client.query(query, [
				blockNumber,
				timestamp,
				collateral.tokenAddress,
				collateral.symbol,
				collateral.decimals,
				totalCollateral.toString(),
				positionCount,
			]);
		}
	}

	async saveCollateralStates(client: any, collaterals: CollateralState[], blockNumber: number): Promise<void> {
		const timestamp = new Date();
		for (const collateral of collaterals) {
			const query = `
					INSERT INTO collateral_states (
						block_number, timestamp, token_address, symbol, decimals, total_collateral, position_count
					)
					VALUES ($1, $2, $3, $4, $5, $6, $7)
					ON CONFLICT (block_number, token_address) DO UPDATE SET
						timestamp = EXCLUDED.timestamp,
						symbol = EXCLUDED.symbol,
						decimals = EXCLUDED.decimals,
						total_collateral = EXCLUDED.total_collateral,
						position_count = EXCLUDED.position_count
				`;

			await client.query(query, [
				blockNumber,
				timestamp,
				collateral.tokenAddress,
				collateral.symbol,
				collateral.decimals,
				collateral.totalCollateral.toString(),
				collateral.positionCount,
			]);
		}
	}

	// Mapping function
	private mapToDto(record: CollateralStateRecord): CollateralStateDto {
		return {
			tokenAddress: record.token_address,
			symbol: record.symbol,
			decimals: record.decimals,
			totalCollateral: record.total_collateral,
			positionCount: record.position_count,
			block_number: parseInt(record.block_number),
			timestamp: record.timestamp,
		};
	}
}

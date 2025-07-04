import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { PositionState } from '../../common/dto';

@Injectable()
export class CollateralRepository {
	constructor(private readonly db: DatabaseService) {}

	// Read operations
	async getAllCollateralStates(): Promise<any[]> {
		return this.db.fetch(`
			SELECT * FROM collateral_states 
			WHERE block_number = (SELECT MAX(block_number) FROM collateral_states)
			ORDER BY token_address
		`);
	}

	// Write operations
	async persistCollateralStates(
		client: any,
		blockNumber: number,
		timestamp: Date,
		collaterals: any[],
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
				(p) => p.collateralAddress.toLowerCase() === collateral.address.toLowerCase() && !p.isClosed
			);
			const positionCount = collateralPositions.length;
			let totalCollateral = BigInt(0);

			for (const position of collateralPositions) {
				totalCollateral += BigInt(position.collateralBalance || 0);
			}

			await client.query(query, [
				blockNumber,
				timestamp,
				collateral.address,
				collateral.symbol,
				collateral.decimals,
				totalCollateral.toString(),
				positionCount,
			]);
		}
	}

	async saveCollateralStates(collaterals: any[], blockNumber: number): Promise<void> {
		await this.db.withTransaction(async (client) => {
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
		});
	}
}

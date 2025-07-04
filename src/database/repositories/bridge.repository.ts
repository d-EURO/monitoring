import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';

@Injectable()
export class BridgeRepository {
	constructor(private readonly db: DatabaseService) {}

	// Read operations
	async getAllBridgeStates(): Promise<any[]> {
		return this.db.fetch(`
			SELECT * FROM bridge_states 
			WHERE block_number = (SELECT MAX(block_number) FROM bridge_states)
			ORDER BY bridge_address
		`);
	}

	async getActiveBridgeStates(): Promise<any[]> {
		const currentTime = Math.floor(Date.now() / 1000);
		return this.db.fetch(
			`
			SELECT * FROM bridge_states 
			WHERE horizon > $1 
				AND block_number = (SELECT MAX(block_number) FROM bridge_states)
			ORDER BY bridge_address
		`,
			[currentTime]
		);
	}

	// Write operations
	async saveBridgeStates(client: any, bridges: any[], blockNumber: number): Promise<void> {
		if (bridges.length === 0) return;

		const timestamp = new Date();
		for (const bridge of bridges) {
			const query = `
				INSERT INTO bridge_states (
					block_number, timestamp, bridge_address, eur_address, eur_symbol, eur_decimals,
					deuro_address, horizon, limit, minted
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				ON CONFLICT (block_number, bridge_address) DO UPDATE SET
					timestamp = EXCLUDED.timestamp,
					eur_address = EXCLUDED.eur_address,
					eur_symbol = EXCLUDED.eur_symbol,
					eur_decimals = EXCLUDED.eur_decimals,
					deuro_address = EXCLUDED.deuro_address,
					horizon = EXCLUDED.horizon,
					limit = EXCLUDED.limit,
					minted = EXCLUDED.minted
			`;

			await client.query(query, [
				blockNumber,
				timestamp,
				bridge.address,
				bridge.eurAddress,
				bridge.eurSymbol,
				bridge.eurDecimals,
				bridge.dEuroAddress,
				bridge.horizon,
				bridge.limit,
				bridge.minted,
			]);
		}
	}
}

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { StablecoinBridgeState } from '../../common/dto/stablecoinBridge.dto';
import { BridgeStateRecord } from '../types/state-records';

@Injectable()
export class BridgeRepository {
	constructor(private readonly db: DatabaseService) {}

	// Read operations
	async getAllBridgeStates(): Promise<StablecoinBridgeState[]> {
		const records = await this.db.fetch<BridgeStateRecord>(`
			SELECT * FROM bridge_states 
			ORDER BY bridge_address
		`);
		return records.map(this.mapToDomain);
	}

	async getActiveBridgeStates(): Promise<StablecoinBridgeState[]> {
		const currentTime = Math.floor(Date.now() / 1000);
		const records = await this.db.fetch<BridgeStateRecord>(
			`
			SELECT * FROM bridge_states 
			WHERE horizon > $1 
			ORDER BY bridge_address
		`,
			[currentTime]
		);
		return records.map(this.mapToDomain);
	}

	// Write operations
	async saveBridgeStates(client: any, bridges: StablecoinBridgeState[], blockNumber: number): Promise<void> {
		if (bridges.length === 0) return;

		const timestamp = new Date();
		for (const bridge of bridges) {
			const query = `
				INSERT INTO bridge_states (
					block_number, timestamp, bridge_address, eur_address, eur_symbol, eur_decimals,
					deuro_address, horizon, limit, minted
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				ON CONFLICT (bridge_address) DO UPDATE SET
					block_number = EXCLUDED.block_number,
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
				bridge.horizon.toString(),
				bridge.limit.toString(),
				bridge.minted.toString(),
			]);
		}
	}

	// Mapping function
	private mapToDomain(record: BridgeStateRecord): StablecoinBridgeState {
		return {
			address: record.bridge_address,
			eurAddress: record.eur_address,
			eurSymbol: record.eur_symbol,
			eurDecimals: record.eur_decimals,
			dEuroAddress: record.deuro_address,
			horizon: BigInt(record.horizon),
			limit: BigInt(record.limit),
			minted: BigInt(record.minted),
		};
	}
}

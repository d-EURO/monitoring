import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { SystemStateData } from '../../common/interfaces/state-data.interface';

@Injectable()
export class SystemStateRepository {
	constructor(private readonly db: DatabaseService) {}

	// Read operations
	async getLatestSystemState(): Promise<any> {
		const result = await this.db.fetch(`
			SELECT * FROM system_state 
			WHERE id = 1
			LIMIT 1
		`);
		return result[0];
	}

	// Write operations
	async persistSystemState(client: any, stateData: SystemStateData): Promise<void> {
		const query = `
			INSERT INTO system_state (
				id, block_number, timestamp,
				-- Core state
				deuro_total_supply, deps_total_supply, equity_shares, equity_price,
				reserve_total, reserve_minter, reserve_equity,
				-- 24h metrics
				deuro_volume_24h, deuro_transfer_count_24h, deuro_unique_addresses_24h,
				deps_volume_24h, deps_transfer_count_24h, deps_unique_addresses_24h,
				equity_trade_volume_24h, equity_trade_count_24h, equity_delegations_24h,
				savings_added_24h, savings_withdrawn_24h, savings_interest_collected_24h,
				-- Global metrics
				deuro_loss, deuro_profit, deuro_profit_distributed,
				savings_total, savings_interest_collected, savings_rate,
				frontend_fees_collected, frontends_active
			) VALUES (
				1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
				$16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
			)
			ON CONFLICT (id) DO UPDATE SET
				block_number = EXCLUDED.block_number,
				timestamp = EXCLUDED.timestamp,
				deuro_total_supply = EXCLUDED.deuro_total_supply,
				deps_total_supply = EXCLUDED.deps_total_supply,
				equity_shares = EXCLUDED.equity_shares,
				equity_price = EXCLUDED.equity_price,
				reserve_total = EXCLUDED.reserve_total,
				reserve_minter = EXCLUDED.reserve_minter,
				reserve_equity = EXCLUDED.reserve_equity,
				deuro_volume_24h = EXCLUDED.deuro_volume_24h,
				deuro_transfer_count_24h = EXCLUDED.deuro_transfer_count_24h,
				deuro_unique_addresses_24h = EXCLUDED.deuro_unique_addresses_24h,
				deps_volume_24h = EXCLUDED.deps_volume_24h,
				deps_transfer_count_24h = EXCLUDED.deps_transfer_count_24h,
				deps_unique_addresses_24h = EXCLUDED.deps_unique_addresses_24h,
				equity_trade_volume_24h = EXCLUDED.equity_trade_volume_24h,
				equity_trade_count_24h = EXCLUDED.equity_trade_count_24h,
				equity_delegations_24h = EXCLUDED.equity_delegations_24h,
				savings_added_24h = EXCLUDED.savings_added_24h,
				savings_withdrawn_24h = EXCLUDED.savings_withdrawn_24h,
				savings_interest_collected_24h = EXCLUDED.savings_interest_collected_24h,
				deuro_loss = EXCLUDED.deuro_loss,
				deuro_profit = EXCLUDED.deuro_profit,
				deuro_profit_distributed = EXCLUDED.deuro_profit_distributed,
				savings_total = EXCLUDED.savings_total,
				savings_interest_collected = EXCLUDED.savings_interest_collected,
				savings_rate = EXCLUDED.savings_rate,
				frontend_fees_collected = EXCLUDED.frontend_fees_collected,
				frontends_active = EXCLUDED.frontends_active
		`;

		await client.query(query, [
			stateData.block_number,
			stateData.timestamp,
			stateData.deuro_total_supply.toString(),
			stateData.deps_total_supply.toString(),
			stateData.equity_shares.toString(),
			stateData.equity_price.toString(),
			stateData.reserve_total.toString(),
			stateData.reserve_minter.toString(),
			stateData.reserve_equity.toString(),
			stateData.deuro_volume_24h.toString(),
			stateData.deuro_transfer_count_24h,
			stateData.deuro_unique_addresses_24h,
			stateData.deps_volume_24h.toString(),
			stateData.deps_transfer_count_24h,
			stateData.deps_unique_addresses_24h,
			stateData.equity_trade_volume_24h.toString(),
			stateData.equity_trade_count_24h,
			stateData.equity_delegations_24h,
			stateData.savings_added_24h.toString(),
			stateData.savings_withdrawn_24h.toString(),
			stateData.savings_interest_collected_24h.toString(),
			stateData.deuro_loss.toString(),
			stateData.deuro_profit.toString(),
			stateData.deuro_profit_distributed.toString(),
			stateData.savings_total.toString(),
			stateData.savings_interest_collected.toString(),
			stateData.savings_rate.toString(),
			stateData.frontend_fees_collected.toString(),
			stateData.frontends_active,
		]);
	}
}

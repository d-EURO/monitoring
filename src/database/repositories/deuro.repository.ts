import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { DeuroStateRecord } from '../types';
import { DeuroStateData } from 'src/common/dto';

@Injectable()
export class DeuroStateRepository {
	constructor(private readonly db: DatabaseService) {}

	async getDeuroState(): Promise<DeuroStateData | null> {
		const results = await this.db.fetch<DeuroStateRecord>(`
			SELECT * FROM deuro_state 
			WHERE id = 1
			LIMIT 1
		`);
		return results[0] ? this.mapToDomain(results[0]) : null;
	}

	async getDeuro24hMetrics(): Promise<{
		deuro_volume_24h: bigint;
		deuro_transfer_count_24h: number;
		deuro_unique_addresses_24h: number;
	}> {
		// Exclude mint/burn transactions
		const results = await this.db.fetch(`
			WITH transfer_data AS (
				SELECT 
					value,
					from_address,
					to_address
				FROM deuro_transfer_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			),
			volume_data AS (
				SELECT 
					COALESCE(SUM(value), 0) as volume,
					COUNT(*) as count
				FROM transfer_data
				WHERE from_address != '0x0000000000000000000000000000000000000000' 
					AND to_address != '0x0000000000000000000000000000000000000000'
			),
			unique_addresses AS (
				SELECT COUNT(DISTINCT address) as unique_count
				FROM (
					SELECT from_address as address FROM transfer_data WHERE from_address != '0x0000000000000000000000000000000000000000'
					UNION
					SELECT to_address as address FROM transfer_data WHERE to_address != '0x0000000000000000000000000000000000000000'
				) addresses
			)
			SELECT 
				volume_data.volume,
				volume_data.count,
				unique_addresses.unique_count as unique_addresses
			FROM volume_data, unique_addresses
		`);

		return {
			deuro_volume_24h: BigInt(results[0].volume),
			deuro_transfer_count_24h: Number(results[0].count),
			deuro_unique_addresses_24h: Number(results[0].unique_addresses),
		};
	}

	async getDeps24hMetrics(): Promise<{
		deps_volume_24h: bigint;
		deps_transfer_count_24h: number;
		deps_unique_addresses_24h: number;
	}> {
		// Exclude mint/burn transactions
		const results = await this.db.fetch(`
			WITH transfer_data AS (
				SELECT 
					value,
					from_address,
					to_address
				FROM deps_transfer_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			),
			volume_data AS (
				SELECT 
					COALESCE(SUM(value), 0) as volume,
					COUNT(*) as count
				FROM transfer_data
				WHERE from_address != '0x0000000000000000000000000000000000000000' 
					AND to_address != '0x0000000000000000000000000000000000000000'
			),
			unique_addresses AS (
				SELECT COUNT(DISTINCT address) as unique_count
				FROM (
					SELECT from_address as address FROM transfer_data WHERE from_address != '0x0000000000000000000000000000000000000000'
					UNION
					SELECT to_address as address FROM transfer_data WHERE to_address != '0x0000000000000000000000000000000000000000'
				) addresses
			)
			SELECT 
				volume_data.volume,
				volume_data.count,
				unique_addresses.unique_count as unique_addresses
			FROM volume_data, unique_addresses
		`);

		return {
			deps_volume_24h: BigInt(results[0].volume),
			deps_transfer_count_24h: Number(results[0].count),
			deps_unique_addresses_24h: Number(results[0].unique_addresses),
		};
	}

	async getEquity24hMetrics(): Promise<{
		equity_trade_volume_24h: bigint;
		equity_trade_count_24h: number;
		equity_delegations_24h: number;
	}> {
		const [tradeResults, delegationResults] = await Promise.all([
			this.db.fetch(`
				SELECT 
					COALESCE(SUM(tot_price), 0) as volume,
					COUNT(*) as count
				FROM equity_trade_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			`),
			this.db.fetch(`
				SELECT COUNT(*) as count
				FROM equity_delegation_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			`),
		]);

		return {
			equity_trade_volume_24h: BigInt(tradeResults[0].volume),
			equity_trade_count_24h: Number(tradeResults[0].count),
			equity_delegations_24h: Number(delegationResults[0].count),
		};
	}

	async getDeuroLossTotal(): Promise<bigint> {
		const results = await this.db.fetch(`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM deuro_loss_events
		`);
		return BigInt(results[0].total);
	}

	async getDeuroProfitTotal(): Promise<bigint> {
		const results = await this.db.fetch(`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM deuro_profit_events
		`);
		return BigInt(results[0].total);
	}

	async getDeuroProfitDistributedTotal(): Promise<bigint> {
		const results = await this.db.fetch(`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM deuro_profit_distributed_events
		`);
		return BigInt(results[0].total);
	}

	async getSavings24hMetrics(): Promise<{
		savings_added_24h: bigint;
		savings_withdrawn_24h: bigint;
		savings_interest_collected_24h: bigint;
	}> {
		const [savedResults, withdrawnResults, interestResults] = await Promise.all([
			this.db.fetch(`
				SELECT COALESCE(SUM(amount), 0) as total
				FROM savings_saved_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			`),
			this.db.fetch(`
				SELECT COALESCE(SUM(amount), 0) as total
				FROM savings_withdrawn_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			`),
			this.db.fetch(`
				SELECT COALESCE(SUM(interest), 0) as total
				FROM savings_interest_collected_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			`),
		]);

		return {
			savings_added_24h: BigInt(savedResults[0].total),
			savings_withdrawn_24h: BigInt(withdrawnResults[0].total),
			savings_interest_collected_24h: BigInt(interestResults[0].total),
		};
	}

	async getTotalInterestCollected(): Promise<bigint> {
		const results = await this.db.fetch(`
			SELECT COALESCE(SUM(interest), 0) as total
			FROM savings_interest_collected_events
		`);
		return BigInt(results[0].total);
	}

	async getDeuroMintBurn24hMetrics(): Promise<{
		deuro_minted_24h: bigint;
		deuro_burned_24h: bigint;
	}> {
		const [mintedResults, burnedResults] = await Promise.all([
			this.db.fetch(`
				SELECT COALESCE(SUM(value), 0) as total
				FROM deuro_transfer_events 
				WHERE from_address = '0x0000000000000000000000000000000000000000'
					AND timestamp > NOW() - INTERVAL '24 hours'
			`),
			this.db.fetch(`
				SELECT COALESCE(SUM(value), 0) as total
				FROM deuro_transfer_events 
				WHERE to_address = '0x0000000000000000000000000000000000000000'
					AND timestamp > NOW() - INTERVAL '24 hours'
			`),
		]);

		return {
			deuro_minted_24h: BigInt(mintedResults[0].total),
			deuro_burned_24h: BigInt(burnedResults[0].total),
		};
	}

	// Write operations
	async persistDeuroState(stateData: DeuroStateData, client: any, blockNumber: number): Promise<void> {
		const query = `
				INSERT INTO deuro_state (
					id,
					-- Core state
					deuro_total_supply, deps_total_supply, equity_shares, equity_price,
					reserve_total, reserve_minter, reserve_equity,
					-- 24h metrics
					deuro_volume_24h, deuro_transfer_count_24h, deuro_unique_addresses_24h,
					deps_volume_24h, deps_transfer_count_24h, deps_unique_addresses_24h,
					equity_trade_volume_24h, equity_trade_count_24h, equity_delegations_24h,
					savings_added_24h, savings_withdrawn_24h, savings_interest_collected_24h,
					deuro_minted_24h, deuro_burned_24h,
					-- Global metrics
					deuro_loss, deuro_profit, deuro_profit_distributed,
					savings_total, savings_interest_collected, savings_rate,
					frontend_fees_collected, frontends_active,
					-- Currency rates
					usd_to_eur_rate, usd_to_chf_rate,
					-- Metadata
					block_number, timestamp
				) VALUES (
					1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
					$16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, NOW()
				)
				ON CONFLICT (id) DO UPDATE SET
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
					deuro_minted_24h = EXCLUDED.deuro_minted_24h,
					deuro_burned_24h = EXCLUDED.deuro_burned_24h,
					deuro_loss = EXCLUDED.deuro_loss,
					deuro_profit = EXCLUDED.deuro_profit,
					deuro_profit_distributed = EXCLUDED.deuro_profit_distributed,
					savings_total = EXCLUDED.savings_total,
					savings_interest_collected = EXCLUDED.savings_interest_collected,
					savings_rate = EXCLUDED.savings_rate,
					frontend_fees_collected = EXCLUDED.frontend_fees_collected,
					frontends_active = EXCLUDED.frontends_active,
					usd_to_eur_rate = EXCLUDED.usd_to_eur_rate,
					usd_to_chf_rate = EXCLUDED.usd_to_chf_rate,
					block_number = EXCLUDED.block_number,
					timestamp = EXCLUDED.timestamp
			`;

		await client.query(query, [
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
			stateData.deuro_minted_24h.toString(),
			stateData.deuro_burned_24h.toString(),
			stateData.deuro_loss.toString(),
			stateData.deuro_profit.toString(),
			stateData.deuro_profit_distributed.toString(),
			stateData.savings_total.toString(),
			stateData.savings_interest_collected.toString(),
			stateData.savings_rate.toString(),
			stateData.frontend_fees_collected.toString(),
			stateData.frontends_active,
			stateData.usd_to_eur_rate,
			stateData.usd_to_chf_rate,
			blockNumber,
		]);
	}

	// Mapping function
	private mapToDomain(record: DeuroStateRecord): DeuroStateData {
		return {
			deuro_total_supply: BigInt(record.deuro_total_supply),
			deps_total_supply: BigInt(record.deps_total_supply),
			equity_shares: BigInt(record.equity_shares),
			equity_price: BigInt(record.equity_price),
			reserve_total: BigInt(record.reserve_total),
			reserve_minter: BigInt(record.reserve_minter),
			reserve_equity: BigInt(record.reserve_equity),
			deuro_volume_24h: BigInt(record.deuro_volume_24h),
			deuro_transfer_count_24h: record.deuro_transfer_count_24h,
			deuro_unique_addresses_24h: record.deuro_unique_addresses_24h,
			deps_volume_24h: BigInt(record.deps_volume_24h),
			deps_transfer_count_24h: record.deps_transfer_count_24h,
			deps_unique_addresses_24h: record.deps_unique_addresses_24h,
			equity_trade_volume_24h: BigInt(record.equity_trade_volume_24h),
			equity_trade_count_24h: record.equity_trade_count_24h,
			equity_delegations_24h: record.equity_delegations_24h,
			deuro_loss: BigInt(record.deuro_loss),
			deuro_profit: BigInt(record.deuro_profit),
			deuro_profit_distributed: BigInt(record.deuro_profit_distributed),
			savings_total: BigInt(record.savings_total),
			savings_rate: BigInt(record.savings_rate),
			savings_added_24h: BigInt(record.savings_added_24h),
			savings_withdrawn_24h: BigInt(record.savings_withdrawn_24h),
			savings_interest_collected_24h: BigInt(record.savings_interest_collected_24h),
			deuro_minted_24h: BigInt(record.deuro_minted_24h),
			deuro_burned_24h: BigInt(record.deuro_burned_24h),
			savings_interest_collected: BigInt(record.savings_interest_collected),
			frontend_fees_collected: BigInt(record.frontend_fees_collected),
			frontends_active: record.frontends_active,
			usd_to_eur_rate: record.usd_to_eur_rate,
			usd_to_chf_rate: record.usd_to_chf_rate,
		};
	}
}

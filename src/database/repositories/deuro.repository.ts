import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { SystemStateRecord } from '../types';

@Injectable()
export class DeuroRepository {
	constructor(private readonly db: DatabaseService) {}

	async getLatestState(): Promise<SystemStateRecord | null> {
		const results = await this.db.fetch<SystemStateRecord>(`
			SELECT * FROM system_state 
			WHERE id = 1
			LIMIT 1
		`);
		return results[0] || null;
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
}

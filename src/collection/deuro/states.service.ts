import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DatabaseService } from '../../database/database.service';

export interface DeuroStateData {
	deuro_total_supply: bigint;
	deps_total_supply: bigint;
	equity_shares: bigint;
	equity_price: bigint;
	reserve_total: bigint;
	reserve_minter: bigint;
	reserve_equity: bigint;
	deuro_volume_24h: bigint;
	deuro_transfer_count_24h: number;
	deuro_unique_addresses_24h: number;
	deps_volume_24h: bigint;
	deps_transfer_count_24h: number;
	deps_unique_addresses_24h: number;
	equity_trade_volume_24h: bigint;
	equity_trade_count_24h: number;
	equity_delegations_24h: number;
	deuro_loss: bigint;
	deuro_profit: bigint;
	deuro_profit_distributed: bigint;
	savings_total: bigint;
	savings_rate: bigint;
	savings_added_24h: bigint;
	savings_withdrawn_24h: bigint;
	savings_interest_collected_24h: bigint;
	savings_interest_collected: bigint;
}

@Injectable()
export class DeuroStatesService {
	private readonly logger = new Logger(DeuroStatesService.name);

	constructor(private readonly databaseService: DatabaseService) {}

	async getDeuroState(
		deuroContract: ethers.Contract,
		equityContract: ethers.Contract,
		depsContract: ethers.Contract,
		savingsContract: ethers.Contract
	): Promise<DeuroStateData> {
		this.logger.log('Fetching dEURO state...');

		// Get on-chain state
		const [deuroTotalSupply, reserveTotal, minterReserve, equityShares, equityPrice, depsTotalSupply, currentRatePPM, savingsBalance] =
			await Promise.all([
				deuroContract.totalSupply(),
				deuroContract.balanceOf(await deuroContract.reserve()),
				deuroContract.minterReserve(),
				equityContract.totalSupply(),
				equityContract.price(),
				depsContract.totalSupply(),
				savingsContract.currentRatePPM(),
				deuroContract.balanceOf(await savingsContract.getAddress()),
			]);

		// Calculate equity reserve (total reserve minus minter reserve)
		const equityReserve = BigInt(reserveTotal) - BigInt(minterReserve);

		// Get 24h metrics from event tables
		const [
			deuroMetrics24h,
			depsMetrics24h,
			equityMetrics24h,
			savingsMetrics24h,
			deuroLossTotal,
			deuroProfitTotal,
			deuroProfitDistributedTotal,
			totalInterestCollected,
		] = await Promise.all([
			this.getDeuro24hMetrics(),
			this.getDeps24hMetrics(),
			this.getEquity24hMetrics(),
			this.getSavings24hMetrics(),
			this.getDeuroLossTotal(),
			this.getDeuroProfitTotal(),
			this.getDeuroProfitDistributedTotal(),
			this.getTotalInterestCollected(),
		]);

		return {
			deuro_total_supply: deuroTotalSupply,
			deps_total_supply: depsTotalSupply,
			equity_shares: equityShares,
			equity_price: equityPrice,
			reserve_total: reserveTotal,
			reserve_minter: minterReserve,
			reserve_equity: equityReserve,
			...deuroMetrics24h,
			...depsMetrics24h,
			...equityMetrics24h,
			deuro_loss: deuroLossTotal,
			deuro_profit: deuroProfitTotal,
			deuro_profit_distributed: deuroProfitDistributedTotal,
			savings_total: savingsBalance,
			savings_rate: currentRatePPM,
			...savingsMetrics24h,
			savings_interest_collected: totalInterestCollected,
		};
	}

	private async getDeuro24hMetrics(): Promise<{
		deuro_volume_24h: bigint;
		deuro_transfer_count_24h: number;
		deuro_unique_addresses_24h: number;
	}> {
		// Fix unique address calculation to avoid double counting
		// Fix volume calculation to exclude minting (from zero address) and burning (to zero address)
		const results = await this.databaseService.fetch(`
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

	private async getDeps24hMetrics(): Promise<{
		deps_volume_24h: bigint;
		deps_transfer_count_24h: number;
		deps_unique_addresses_24h: number;
	}> {
		// Fix unique address calculation to avoid double counting
		// Fix volume calculation to exclude minting (from zero address) and burning (to zero address)
		const results = await this.databaseService.fetch(`
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

	private async getEquity24hMetrics(): Promise<{
		equity_trade_volume_24h: bigint;
		equity_trade_count_24h: number;
		equity_delegations_24h: number;
	}> {
		const [tradeResults, delegationResults] = await Promise.all([
			this.databaseService.fetch(`
				SELECT 
					COALESCE(SUM(tot_price), 0) as volume,
					COUNT(*) as count
				FROM equity_trade_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			`),
			this.databaseService.fetch(`
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

	private async getDeuroLossTotal(): Promise<bigint> {
		const results = await this.databaseService.fetch(`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM deuro_loss_events
		`);
		return BigInt(results[0].total);
	}

	private async getDeuroProfitTotal(): Promise<bigint> {
		const results = await this.databaseService.fetch(`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM deuro_profit_events
		`);
		return BigInt(results[0].total);
	}

	private async getDeuroProfitDistributedTotal(): Promise<bigint> {
		const results = await this.databaseService.fetch(`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM deuro_profit_distributed_events
		`);
		return BigInt(results[0].total);
	}

	private async getSavings24hMetrics(): Promise<{
		savings_added_24h: bigint;
		savings_withdrawn_24h: bigint;
		savings_interest_collected_24h: bigint;
	}> {
		const [savedResults, withdrawnResults, interestResults] = await Promise.all([
			this.databaseService.fetch(`
				SELECT COALESCE(SUM(amount), 0) as total
				FROM savings_saved_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			`),
			this.databaseService.fetch(`
				SELECT COALESCE(SUM(amount), 0) as total
				FROM savings_withdrawn_events 
				WHERE timestamp > NOW() - INTERVAL '24 hours'
			`),
			this.databaseService.fetch(`
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

	private async getTotalInterestCollected(): Promise<bigint> {
		const results = await this.databaseService.fetch(`
			SELECT COALESCE(SUM(interest), 0) as total
			FROM savings_interest_collected_events
		`);
		return BigInt(results[0].total);
	}
}

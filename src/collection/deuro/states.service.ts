import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DatabaseService } from '../../database/database.service';
import { DeuroStateData } from '../../common/interfaces/state-data.interface';
import { MulticallService } from '../../common/services';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { DeuroRepository } from 'src/database/repositories';

@Injectable()
export class DeuroStatesService {
	private readonly logger = new Logger(DeuroStatesService.name);

	constructor(
		private readonly deuroRepository: DeuroRepository,
		private readonly multicallService: MulticallService,
		private readonly blockchainService: BlockchainService
	) {}

	async getDeuroState(
		deuroContract: ethers.Contract,
		equityContract: ethers.Contract,
		depsContract: ethers.Contract,
		savingsContract: ethers.Contract
	): Promise<DeuroStateData> {
		this.logger.log('Fetching dEURO state using multicall...');

		// Prepare all contract calls
		const calls = [
			{ contract: deuroContract, method: 'totalSupply' },
			{ contract: deuroContract, method: 'minterReserve' },
			{ contract: deuroContract, method: 'balanceOf', args: [this.blockchainService.getContracts().equityContract.getAddress()] },
			{ contract: deuroContract, method: 'balanceOf', args: [this.blockchainService.getContracts().savingsContract.getAddress()] },
			{ contract: equityContract, method: 'totalSupply' },
			{ contract: equityContract, method: 'price' },
			{ contract: depsContract, method: 'totalSupply' },
			{ contract: savingsContract, method: 'currentRatePPM' },
		];

		const results = await this.multicallService.executeBatch(deuroContract.runner as ethers.Provider, calls);
		const [deuroTotalSupply, minterReserve, reserveTotal, savingsBalance, equityShares, equityPrice, depsTotalSupply, currentRatePPM] =
			results;

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
			this.deuroRepository.getDeuro24hMetrics(),
			this.deuroRepository.getDeps24hMetrics(),
			this.deuroRepository.getEquity24hMetrics(),
			this.deuroRepository.getSavings24hMetrics(),
			this.deuroRepository.getDeuroLossTotal(),
			this.deuroRepository.getDeuroProfitTotal(),
			this.deuroRepository.getDeuroProfitDistributedTotal(),
			this.deuroRepository.getTotalInterestCollected(),
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
}

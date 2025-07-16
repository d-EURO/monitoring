import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { MulticallService, PriceService } from '../../common/services';
import { DeuroStateRepository } from 'src/database/repositories';
import { ContractSet } from '../../blockchain/types/contracts';
import { DeuroStateData } from 'src/common/dto';

@Injectable()
export class DeuroStatesService {
	private readonly logger = new Logger(DeuroStatesService.name);

	constructor(
		private readonly deuroStateRepository: DeuroStateRepository,
		private readonly multicallService: MulticallService,
		private readonly priceService: PriceService
	) {}

	async getDeuroState(contracts: ContractSet): Promise<DeuroStateData> {
		this.logger.log('Fetching dEURO state using multicall...');
		const { deuroContract, equityContract, depsContract, savingsContract } = contracts;

		// Connect contracts to multicall provider
		const provider = deuroContract.runner as ethers.Provider;
		const multicallDeuro = this.multicallService.connect(deuroContract, provider);
		const multicallEquity = this.multicallService.connect(equityContract, provider);
		const multicallDeps = this.multicallService.connect(depsContract, provider);
		const multicallSavings = this.multicallService.connect(savingsContract, provider);

		const [deuroTotalSupply, minterReserve, reserveTotal, savingsBalance, equityShares, equityPrice, depsTotalSupply, currentRatePPM] =
			await this.multicallService.executeBatch([
				multicallDeuro.totalSupply(),
				multicallDeuro.minterReserve(),
				multicallDeuro.balanceOf(await equityContract.getAddress()),
				multicallDeuro.balanceOf(await savingsContract.getAddress()),
				multicallEquity.totalSupply(),
				multicallEquity.price(),
				multicallDeps.totalSupply(),
				multicallSavings.currentRatePPM(),
			]);

		// Get 24h metrics from event tables
		const [
			deuroMetrics24h,
			depsMetrics24h,
			equityMetrics24h,
			savingsMetrics24h,
			deuroMintBurn24h,
			deuroLossTotal,
			deuroProfitTotal,
			deuroProfitDistributedTotal,
			totalInterestCollected,
		] = await Promise.all([
			this.deuroStateRepository.getDeuro24hMetrics(),
			this.deuroStateRepository.getDeps24hMetrics(),
			this.deuroStateRepository.getEquity24hMetrics(),
			this.deuroStateRepository.getSavings24hMetrics(),
			this.deuroStateRepository.getDeuroMintBurn24hMetrics(),
			this.deuroStateRepository.getDeuroLossTotal(),
			this.deuroStateRepository.getDeuroProfitTotal(),
			this.deuroStateRepository.getDeuroProfitDistributedTotal(),
			this.deuroStateRepository.getTotalInterestCollected(),
		]);

		// Fetch currency conversion rates
		const [usdToEur, usdToChf] = await Promise.all([
			this.priceService.getUsdToEur(),
			this.priceService.getUsdToChf()
		]);

		return {
			deuro_total_supply: deuroTotalSupply,
			deps_total_supply: depsTotalSupply,
			equity_shares: equityShares,
			equity_price: equityPrice,
			reserve_total: reserveTotal,
			reserve_minter: minterReserve,
			reserve_equity: BigInt(reserveTotal) - BigInt(minterReserve),
			...deuroMetrics24h,
			...depsMetrics24h,
			...equityMetrics24h,
			deuro_loss: deuroLossTotal,
			deuro_profit: deuroProfitTotal,
			deuro_profit_distributed: deuroProfitDistributedTotal,
			savings_total: savingsBalance,
			savings_rate: currentRatePPM,
			...savingsMetrics24h,
			...deuroMintBurn24h,
			savings_interest_collected: totalInterestCollected,
			frontend_fees_collected: BigInt(0), // TODO: Placeholder, frontend fees not implemented yet
			frontends_active: 0, // TODO: Placeholder, frontends not implemented yet
			usd_to_eur_rate: usdToEur,
			usd_to_chf_rate: usdToChf,
		};
	}

	async persistDeuroState(client: any, stateData: DeuroStateData, blockNumber: number): Promise<void> {
		this.logger.log('Persisting dEURO state...');
		try {
			await this.deuroStateRepository.persistDeuroState(stateData, client, blockNumber);
			this.logger.log('dEURO state persisted successfully');
		} catch (error) {
			this.logger.error('Failed to persist dEURO state:', error);
			throw error;
		}
	}
}

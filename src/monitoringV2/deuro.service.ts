import { Injectable, Logger } from '@nestjs/common';
import { DeuroState } from './types';
import { DeuroRepository } from './prisma/repositories/deuro.repository';
import { ProviderService } from './provider.service';
import { PriceService } from './price.service';
import { AppConfigService } from '../config/config.service';
import { ethers } from 'ethers';
import { DecentralizedEUROABI, EquityABI, DEPSWrapperABI, SavingsGatewayABI, ADDRESS } from '@deuro/eurocoin';
import { EventsRepository } from './prisma/repositories/events.repository';

@Injectable()
export class DeuroService {
	private readonly logger = new Logger(DeuroService.name);

	constructor(
		private readonly config: AppConfigService,
		private readonly deuroRepo: DeuroRepository,
		private readonly providerService: ProviderService,
		private readonly eventsRepo: EventsRepository,
		private readonly priceService: PriceService
	) {}

	async initialize(): Promise<void> {
		this.logger.log('DeuroService initialized');
	}

	async syncState(): Promise<void> {
		const chainId = this.config.blockchainId;
		const multicallProvider = this.providerService.multicallProvider;
		const deuro = new ethers.Contract(ADDRESS[chainId].decentralizedEURO, DecentralizedEUROABI, multicallProvider);
		const equity = new ethers.Contract(ADDRESS[chainId].equity, EquityABI, multicallProvider);
		const deps = new ethers.Contract(ADDRESS[chainId].DEPSwrapper, DEPSWrapperABI, multicallProvider);
		const savings = new ethers.Contract(ADDRESS[chainId].savingsGateway, SavingsGatewayABI, multicallProvider);

		// Contract calls
		const calls: Array<() => Promise<any>> = [];
		calls.push(() => deuro.totalSupply());
		calls.push(() => deps.totalSupply());
		calls.push(() => equity.totalSupply());
		calls.push(() => equity.price());
		calls.push(() => deuro.balanceOf(ADDRESS[chainId].equity));
		calls.push(() => deuro.minterReserve());
		calls.push(() => deuro.equity());
		calls.push(() => deuro.balanceOf(ADDRESS[chainId].savingsGateway));
		calls.push(() => savings.currentRatePPM());
		const results = await this.providerService.callBatch(calls);

		let idx = 0;
		const deuroTotalSupply = BigInt(results[idx++]);
		const depsTotalSupply = BigInt(results[idx++]);
		const equityShares = BigInt(results[idx++]);
		const equityPrice = BigInt(results[idx++]);
		const reserveTotal = BigInt(results[idx++]);
		const reserveMinter = BigInt(results[idx++]);
		const reserveEquity = BigInt(results[idx++]);
		const savingsTotal = BigInt(results[idx++]);
		const savingsRate = Number(results[idx++]);

		// Event aggregations and other data
		const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

		const [
			savingsInterestCollected,
			deuroLoss,
			deuroProfit,
			deuroProfitDistributed,
			frontendFeesCollected,
			frontendsActive,
			savingsInterestCollected24h,
			savingsAdded24h,
			savingsWithdrawn24h,
			equityTradeVolume24h,
			equityTradeCount24h,
			equityDelegations24h,
			blockNumber,
			usdToEurRate,
			usdToChfRate,
		] = await Promise.all([
			this.eventsRepo.aggregateEventData('InterestCollected', 'interest'),
			this.eventsRepo.aggregateEventData('Loss', 'amount'),
			this.eventsRepo.aggregateEventData('Profit', 'amount'),
			this.eventsRepo.aggregateEventData('ProfitDistributed', 'amount'),
			this.eventsRepo.aggregateEventData('FrontendCodeRewardsWithdrawn', 'amount'),
			this.eventsRepo.getEventCount('FrontendCodeRegistered'),
			this.eventsRepo.aggregateEventData('InterestCollected', 'interest', oneDayAgo),
			this.eventsRepo.aggregateEventData('Saved', 'amount', oneDayAgo),
			this.eventsRepo.aggregateEventData('Withdrawn', 'amount', oneDayAgo),
			this.eventsRepo.aggregateEventData('Trade', 'totPrice', oneDayAgo),
			this.eventsRepo.getEventCount('Trade', oneDayAgo),
			this.eventsRepo.getEventCount('Delegation', oneDayAgo),
			this.providerService.getBlockNumber(),
			this.priceService.getUsdToEur(),
			this.priceService.getUsdToChf(),
		]);

		// Build state
		const state: DeuroState = {
			deuroTotalSupply,
			depsTotalSupply,
			equityShares,
			equityPrice,
			reserveTotal,
			reserveMinter,
			reserveEquity,
			savingsTotal,
			savingsInterestCollected,
			savingsRate,
			deuroLoss,
			deuroProfit,
			deuroProfitDistributed,
			frontendFeesCollected,
			frontendsActive,
			usdToEurRate,
			usdToChfRate,
			savingsInterestCollected24h,
			savingsAdded24h,
			savingsWithdrawn24h,
			equityTradeVolume24h,
			equityTradeCount24h,
			equityDelegations24h,
			blockNumber: BigInt(blockNumber),
			timestamp: new Date(),
		};

		// Persist to database
		await this.deuroRepo.upsertState(state);
		this.logger.log('Successfully synced dEURO state');
	}
}

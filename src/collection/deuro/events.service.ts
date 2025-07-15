import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
	DeuroTransferEvent,
	DepsTransferEvent,
	DeuroLossEvent,
	DeuroProfitEvent,
	DeuroProfitDistributedEvent,
	EquityTradeEvent,
	EquityDelegationEvent,
	SavingsSavedEvent,
	SavingsInterestCollectedEvent,
	SavingsWithdrawnEvent,
	SavingsRateProposedEvent,
	SavingsRateChangedEvent,
} from '../../common/dto';
import { ContractSet } from '../../blockchain/types/contracts';
import { fetchEvents } from '../../blockchain/utils/utils';
import { EventPersistenceService } from '../../database/event-persistence.service';

export interface DeuroEventsData {
	deuroTransferEvents: DeuroTransferEvent[];
	deuroLossEvents: DeuroLossEvent[];
	deuroProfitEvents: DeuroProfitEvent[];
	deuroProfitDistributedEvents: DeuroProfitDistributedEvent[];
	equityTradeEvents: EquityTradeEvent[];
	equityDelegationEvents: EquityDelegationEvent[];
	depsTransferEvents: DepsTransferEvent[];
	savingsSavedEvents: SavingsSavedEvent[];
	savingsInterestCollectedEvents: SavingsInterestCollectedEvent[];
	savingsWithdrawnEvents: SavingsWithdrawnEvent[];
	savingsRateProposedEvents: SavingsRateProposedEvent[];
	savingsRateChangedEvents: SavingsRateChangedEvent[];
}

@Injectable()
export class DeuroEventsService {
	private readonly logger = new Logger(DeuroEventsService.name);

	constructor(private readonly eventPersistenceService: EventPersistenceService) {}

	async getDeuroEvents(
		contracts: ContractSet,
		fromBlock: number,
		toBlock: number
	): Promise<DeuroEventsData> {
		this.logger.log(`Fetching dEURO events from block ${fromBlock} to ${toBlock}`);
		const { deuroContract, equityContract, depsContract, savingsContract } = contracts;

		const [
			deuroTransferEvents,
			deuroLossEvents,
			deuroProfitEvents,
			deuroProfitDistributedEvents,
			equityTradeEvents,
			equityDelegationEvents,
			depsTransferEvents,
			savingsSavedEvents,
			savingsInterestCollectedEvents,
			savingsWithdrawnEvents,
			savingsRateProposedEvents,
			savingsRateChangedEvents,
		] = await Promise.all([
			fetchEvents<DeuroTransferEvent>(deuroContract, deuroContract.filters.Transfer(), fromBlock, toBlock, this.logger),
			fetchEvents<DeuroLossEvent>(deuroContract, deuroContract.filters.Loss(), fromBlock, toBlock, this.logger),
			fetchEvents<DeuroProfitEvent>(deuroContract, deuroContract.filters.Profit(), fromBlock, toBlock, this.logger),
			fetchEvents<DeuroProfitDistributedEvent>(
				deuroContract,
				deuroContract.filters.ProfitDistributed(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<EquityTradeEvent>(equityContract, equityContract.filters.Trade(), fromBlock, toBlock, this.logger),
			fetchEvents<EquityDelegationEvent>(equityContract, equityContract.filters.Delegation(), fromBlock, toBlock, this.logger),
			fetchEvents<DepsTransferEvent>(depsContract, depsContract.filters.Transfer(), fromBlock, toBlock, this.logger),
			fetchEvents<SavingsSavedEvent>(savingsContract, savingsContract.filters.Saved(), fromBlock, toBlock, this.logger),
			fetchEvents<SavingsInterestCollectedEvent>(
				savingsContract,
				savingsContract.filters.InterestCollected(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<SavingsWithdrawnEvent>(savingsContract, savingsContract.filters.Withdrawn(), fromBlock, toBlock, this.logger),
			fetchEvents<SavingsRateProposedEvent>(savingsContract, savingsContract.filters.RateProposed(), fromBlock, toBlock, this.logger),
			fetchEvents<SavingsRateChangedEvent>(savingsContract, savingsContract.filters.RateChanged(), fromBlock, toBlock, this.logger),
		]);

		// Persist events
		await this.persistEvents({
			deuroTransferEvents,
			deuroLossEvents,
			deuroProfitEvents,
			deuroProfitDistributedEvents,
			equityTradeEvents,
			equityDelegationEvents,
			depsTransferEvents,
			savingsSavedEvents,
			savingsInterestCollectedEvents,
			savingsWithdrawnEvents,
			savingsRateProposedEvents,
			savingsRateChangedEvents,
		});

		return {
			deuroTransferEvents,
			deuroLossEvents,
			deuroProfitEvents,
			deuroProfitDistributedEvents,
			equityTradeEvents,
			equityDelegationEvents,
			depsTransferEvents,
			savingsSavedEvents,
			savingsInterestCollectedEvents,
			savingsWithdrawnEvents,
			savingsRateProposedEvents,
			savingsRateChangedEvents,
		};
	}

	private async persistEvents(eventsData: DeuroEventsData): Promise<void> {
		this.logger.log('Persisting dEURO events to database...');
		await this.eventPersistenceService.persistAllEvents(eventsData);
		this.logger.log('dEURO events persisted successfully');
	}
}

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
	DeuroTransferEvent,
	DepsTransferEvent,
	DeuroLossEvent,
	DeuroProfitEvent,
	DeuroMinterAppliedEvent,
	DeuroMinterDeniedEvent,
	DeuroProfitDistributedEvent,
	EquityTradeEvent,
	EquityDelegationEvent,
	SavingsSavedEvent,
	SavingsInterestCollectedEvent,
	SavingsWithdrawnEvent,
	SavingsRateProposedEvent,
	SavingsRateChangedEvent,
	MintingHubPositionOpenedEvent,
	MintingHubChallengeStartedEvent,
	MintingHubChallengeAvertedEvent,
	MintingHubChallengeSucceededEvent,
	MintingHubPostponedReturnEvent,
	MintingHubForcedSaleEvent,
	RollerRollEvent,
	PositionDeniedEvent,
	PositionMintingUpdateEvent,
	SystemEventsData,
	ContractSet,
} from '../common/dto';
import { PositionV2ABI } from '@deuro/eurocoin';
import { fetchEvents } from '../blockchain/utils/utils';
import { DatabaseService } from '../database/database.service';
import { EventPersistenceService } from '../database/event-persistence.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class EventsService {
	private readonly logger = new Logger(EventsService.name);

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly eventPersistenceService: EventPersistenceService,
		private readonly blockchainService: BlockchainService
	) {}

	async getSystemEvents(fromBlock: number, toBlock: number): Promise<SystemEventsData> {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const eventsData = await this.getEventsInRange(contracts, provider, fromBlock, toBlock);
		await this.persistEvents(eventsData);
		return eventsData;
	}

	private async getEventsInRange(
		contracts: ContractSet,
		provider: ethers.Provider,
		fromBlock: number,
		toBlock: number
	): Promise<SystemEventsData> {
		this.logger.log(`Fetching events from block ${fromBlock} to ${toBlock}`);

		const [
			deuroTransferEvents,
			deuroLossEvents,
			deuroProfitEvents,
			deuroMinterAppliedEvents,
			deuroMinterDeniedEvents,
			deuroProfitDistributedEvents,
			equityTradeEvents,
			equityDelegationEvents,
			depsTransferEvents,
			savingsSavedEvents,
			savingsInterestCollectedEvents,
			savingsWithdrawnEvents,
			savingsRateProposedEvents,
			savingsRateChangedEvents,
			mintingHubPositionOpenedEvents,
			mintingHubChallengeStartedEvents,
			mintingHubChallengeAvertedEvents,
			mintingHubChallengeSucceededEvents,
			mintingHubPostponedReturnEvents,
			mintingHubForcedSaleEvents,
			rollerRollEvents,
		] = await Promise.all([
			fetchEvents<DeuroTransferEvent>(
				contracts.deuroContract,
				contracts.deuroContract.filters.Transfer(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<DeuroLossEvent>(contracts.deuroContract, contracts.deuroContract.filters.Loss(), fromBlock, toBlock, this.logger),
			fetchEvents<DeuroProfitEvent>(
				contracts.deuroContract,
				contracts.deuroContract.filters.Profit(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<DeuroMinterAppliedEvent>(
				contracts.deuroContract,
				contracts.deuroContract.filters.MinterApplied(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<DeuroMinterDeniedEvent>(
				contracts.deuroContract,
				contracts.deuroContract.filters.MinterDenied(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<DeuroProfitDistributedEvent>(
				contracts.deuroContract,
				contracts.deuroContract.filters.ProfitDistributed(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<EquityTradeEvent>(
				contracts.equityContract,
				contracts.equityContract.filters.Trade(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<EquityDelegationEvent>(
				contracts.equityContract,
				contracts.equityContract.filters.Delegation(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<DepsTransferEvent>(
				contracts.depsContract,
				contracts.depsContract.filters.Transfer(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<SavingsSavedEvent>(
				contracts.savingsContract,
				contracts.savingsContract.filters.Saved(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<SavingsInterestCollectedEvent>(
				contracts.savingsContract,
				contracts.savingsContract.filters.InterestCollected(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<SavingsWithdrawnEvent>(
				contracts.savingsContract,
				contracts.savingsContract.filters.Withdrawn(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<SavingsRateProposedEvent>(
				contracts.savingsContract,
				contracts.savingsContract.filters.RateProposed(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<SavingsRateChangedEvent>(
				contracts.savingsContract,
				contracts.savingsContract.filters.RateChanged(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubPositionOpenedEvent>(
				contracts.mintingHubContract,
				contracts.mintingHubContract.filters.PositionOpened(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubChallengeStartedEvent>(
				contracts.mintingHubContract,
				contracts.mintingHubContract.filters.ChallengeStarted(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubChallengeAvertedEvent>(
				contracts.mintingHubContract,
				contracts.mintingHubContract.filters.ChallengeAverted(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubChallengeSucceededEvent>(
				contracts.mintingHubContract,
				contracts.mintingHubContract.filters.ChallengeSucceeded(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubPostponedReturnEvent>(
				contracts.mintingHubContract,
				contracts.mintingHubContract.filters.PostponedReturn(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubForcedSaleEvent>(
				contracts.mintingHubContract,
				contracts.mintingHubContract.filters.ForcedSale(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<RollerRollEvent>(
				contracts.rollerContract,
				contracts.rollerContract.filters.Roll(),
				fromBlock,
				toBlock,
				this.logger
			),
		]);

		this.logger.log('Fetching events from position contracts');
		const activePositionAddresses: string[] = await this.databaseService.getActivePositionAddresses();
		const [positionDeniedEvents, positionMintingUpdateEvents] = await Promise.all([
			Promise.all(
				activePositionAddresses.map(async (p) => {
					const positionContract = new ethers.Contract(p, PositionV2ABI, provider);
					return fetchEvents<PositionDeniedEvent>(
						positionContract,
						positionContract.filters.PositionDenied(),
						fromBlock,
						toBlock,
						this.logger
					);
				})
			).then((events) => events.flat()),
			Promise.all(
				activePositionAddresses.map(async (p) => {
					const positionContract = new ethers.Contract(p, PositionV2ABI, provider);
					return fetchEvents<PositionMintingUpdateEvent>(
						positionContract,
						positionContract.filters.MintingUpdate(),
						fromBlock,
						toBlock,
						this.logger
					);
				})
			).then((events) => events.flat()),
		]);

		return {
			deuroTransferEvents,
			deuroLossEvents,
			deuroProfitEvents,
			deuroMinterAppliedEvents,
			deuroMinterDeniedEvents,
			deuroProfitDistributedEvents,
			equityTradeEvents,
			equityDelegationEvents,
			depsTransferEvents,
			savingsSavedEvents,
			savingsInterestCollectedEvents,
			savingsWithdrawnEvents,
			savingsRateProposedEvents,
			savingsRateChangedEvents,
			mintingHubPositionOpenedEvents,
			mintingHubChallengeStartedEvents,
			mintingHubChallengeAvertedEvents,
			mintingHubChallengeSucceededEvents,
			mintingHubPostponedReturnEvents,
			mintingHubForcedSaleEvents,
			rollerRollEvents,
			positionDeniedEvents,
			positionMintingUpdateEvents,

			// Meta data
			lastEventFetch: Date.now(),
			blockRange: { from: fromBlock, to: toBlock },
		};
	}

	private async persistEvents(eventsData: SystemEventsData): Promise<void> {
		this.logger.log('Persisting events to database...');
		await this.eventPersistenceService.persistAllEvents(eventsData);
		this.logger.log('Events persisted successfully');
	}
}

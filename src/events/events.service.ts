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
	DepsWrapEvent,
	DepsUnwrapEvent,
	SavingsSavedEvent,
	SavingsInterestCollectedEvent,
	SavingsWithdrawnEvent,
	SavingsRateProposedEvent,
	SavingsRateChangedEvent,
	MintingHubPositionOpenedEvent,
	RollerRollEvent,
	PositionDeniedEvent,
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
		const startTime = Date.now();
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();

		const eventsData = await this.getEventsInRange(contracts, provider, fromBlock, toBlock);
		await this.persistEvents(eventsData);
		const duration = Date.now() - startTime;
		await this.recordMonitoringCycle(toBlock, eventsData, duration);
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
			fetchEvents<RollerRollEvent>(
				contracts.rollerContract,
				contracts.rollerContract.filters.Roll(),
				fromBlock,
				toBlock,
				this.logger
			),
		]);

		this.logger.log('Fetching PositionDenied from position contracts');
		const activePositionAddresses: string[] = await this.databaseService.getActivePositionAddresses();
		const positionDeniedEvents: PositionDeniedEvent[] = await Promise.all(
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
		).then((events) => events.flat());

		const depsWrapEvents: DepsWrapEvent[] = depsTransferEvents
			.filter((event) => event.from === ethers.ZeroAddress)
			.map((event) => ({
				...event,
				user: event.to,
				amount: event.value,
			}));

		const depsUnwrapEvents: DepsUnwrapEvent[] = depsTransferEvents
			.filter((event) => event.to === ethers.ZeroAddress)
			.map((event) => ({
				...event,
				user: event.from,
				amount: event.value,
			}));

		return {
			deuroTransferEvents,
			deuroLossEvents,
			deuroProfitEvents,
			deuroMinterAppliedEvents,
			deuroMinterDeniedEvents,
			deuroProfitDistributedEvents,
			equityTradeEvents,
			equityDelegationEvents,
			depsWrapEvents,
			depsUnwrapEvents,
			depsTransferEvents,
			savingsSavedEvents,
			savingsInterestCollectedEvents,
			savingsWithdrawnEvents,
			savingsRateProposedEvents,
			savingsRateChangedEvents,
			mintingHubPositionOpenedEvents,
			rollerRollEvents,
			positionDeniedEvents,

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

	private async recordMonitoringCycle(currentBlock: number, eventsData: SystemEventsData, duration: number): Promise<void> {
		const totalEvents = Object.entries(eventsData).reduce((sum, [key, value]) => {
			if (key === 'lastEventFetch' || key === 'blockRange') return sum;
			return sum + (Array.isArray(value) ? value.length : 0);
		}, 0);

		await this.databaseService.recordMonitoringCycle(currentBlock, totalEvents, duration);
		this.logger.log(`Processed ${totalEvents} new events in ${duration}ms`);
	}

	// API Methods for frontend
	async getEventsByType(eventType: string, fromBlock?: number, toBlock?: number, limit: number = 100) {
		// This will be implemented to query historical events from database
		const query = `
      SELECT * FROM ${eventType}_events 
      WHERE ($1::integer IS NULL OR timestamp >= to_timestamp($1))
      AND ($2::integer IS NULL OR timestamp <= to_timestamp($2))
      ORDER BY timestamp DESC 
      LIMIT $3
    `;

		return this.databaseService.fetch(query, [fromBlock, toBlock, limit]);
	}

	async getTransferEvents(fromDate?: string, toDate?: string, limit: number = 100) {
		let query = 'SELECT * FROM deuro_transfer_events WHERE 1=1';
		const params: any[] = [];

		if (fromDate) {
			params.push(fromDate);
			query += ` AND timestamp >= $${params.length}`;
		}

		if (toDate) {
			params.push(toDate);
			query += ` AND timestamp <= $${params.length}`;
		}

		params.push(limit);
		query += ` ORDER BY timestamp DESC LIMIT $${params.length}`;

		return this.databaseService.fetch(query, params);
	}
}

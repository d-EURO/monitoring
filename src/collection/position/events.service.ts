import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
	MintingHubPositionOpenedEvent,
	RollerRollEvent,
	PositionDeniedEvent,
	PositionMintingUpdateEvent,
	BaseEvent,
} from '../../common/dto';
import { ContractSet } from '../../blockchain/types/contracts';
import { PositionV2ABI } from '@deuro/eurocoin';
import { fetchEvents } from '../../blockchain/utils/utils';
import { EventPersistenceService } from '../../database/event-persistence.service';
import { PositionRepository } from '../../database/repositories';

export interface PositionEventsData {
	mintingHubPositionOpenedEvents: MintingHubPositionOpenedEvent[];
	rollerRollEvents: RollerRollEvent[];
	positionDeniedEvents: PositionDeniedEvent[];
	positionMintingUpdateEvents: PositionMintingUpdateEvent[];
}

@Injectable()
export class PositionEventsService {
	private readonly logger = new Logger(PositionEventsService.name);

	constructor(
		private readonly eventPersistenceService: EventPersistenceService,
		private readonly positionRepository: PositionRepository
	) {}

	async getPositionsEvents(
		contracts: ContractSet,
		provider: ethers.Provider,
		fromBlock: number,
		toBlock: number
	): Promise<PositionEventsData> {
		this.logger.log(`Fetching positions events from block ${fromBlock} to ${toBlock}`);
		const { mintingHubContract, rollerContract } = contracts;

		// Fetch MintingHub and Roller events
		const [mintingHubPositionOpenedEvents, rollerRollEvents] = await Promise.all([
			fetchEvents<MintingHubPositionOpenedEvent>(
				mintingHubContract,
				mintingHubContract.filters.PositionOpened(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<RollerRollEvent>(rollerContract, rollerContract.filters.Roll(), fromBlock, toBlock, this.logger),
		]);

		// Fetch events from individual position contracts
		const activePositionAddresses: string[] = await this.positionRepository.getActivePositionAddresses();
		const [positionDeniedEvents, positionMintingUpdateEvents] = await Promise.all([
			this.fetchPositionEvents<PositionDeniedEvent>(activePositionAddresses, provider, 'PositionDenied', fromBlock, toBlock),
			this.fetchPositionEvents<PositionMintingUpdateEvent>(activePositionAddresses, provider, 'MintingUpdate', fromBlock, toBlock),
		]);

		// Persist events
		await this.persistEvents({
			mintingHubPositionOpenedEvents,
			rollerRollEvents,
			positionDeniedEvents,
			positionMintingUpdateEvents,
		});

		return {
			mintingHubPositionOpenedEvents,
			rollerRollEvents,
			positionDeniedEvents,
			positionMintingUpdateEvents,
		};
	}

	private async fetchPositionEvents<T extends BaseEvent>(
		positionAddresses: string[],
		provider: ethers.Provider,
		eventName: string,
		fromBlock: number,
		toBlock: number
	): Promise<T[]> {
		const eventPromises = positionAddresses.map(async (address) => {
			const positionContract = new ethers.Contract(address, PositionV2ABI, provider);
			const filter = positionContract.filters[eventName]();
			return fetchEvents<T>(positionContract, filter, fromBlock, toBlock, this.logger);
		});
		const events = await Promise.all(eventPromises);
		return events.flat();
	}

	private async persistEvents(eventsData: PositionEventsData): Promise<void> {
		this.logger.log('Persisting positions events to database...');
		await this.eventPersistenceService.persistAllEvents(eventsData);
		this.logger.log('Positions events persisted successfully');
	}
}

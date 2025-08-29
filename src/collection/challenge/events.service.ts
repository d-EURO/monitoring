import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
	MintingHubChallengeStartedEvent,
	MintingHubChallengeAvertedEvent,
	MintingHubChallengeSucceededEvent,
	MintingHubPostponedReturnEvent,
	MintingHubForcedSaleEvent,
} from '../../common/dto';
import { fetchEvents } from '../../blockchain/utils/utils';
import { EventPersistenceService } from '../../database/event-persistence.service';

export interface ChallengeEventsData {
	mintingHubChallengeStartedEvents: MintingHubChallengeStartedEvent[];
	mintingHubChallengeAvertedEvents: MintingHubChallengeAvertedEvent[];
	mintingHubChallengeSucceededEvents: MintingHubChallengeSucceededEvent[];
	mintingHubPostponedReturnEvents: MintingHubPostponedReturnEvent[];
	mintingHubForcedSaleEvents: MintingHubForcedSaleEvent[];
}

@Injectable()
export class ChallengeEventsService {
	private readonly logger = new Logger(ChallengeEventsService.name);

	constructor(private readonly eventPersistenceService: EventPersistenceService) {}

	async getChallengesEvents(mintingHubContract: ethers.Contract, fromBlock: number, toBlock: number): Promise<ChallengeEventsData> {

		const [
			mintingHubChallengeStartedEvents,
			mintingHubChallengeAvertedEvents,
			mintingHubChallengeSucceededEvents,
			mintingHubPostponedReturnEvents,
			mintingHubForcedSaleEvents,
		] = await Promise.all([
			fetchEvents<MintingHubChallengeStartedEvent>(
				mintingHubContract,
				mintingHubContract.filters.ChallengeStarted(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubChallengeAvertedEvent>(
				mintingHubContract,
				mintingHubContract.filters.ChallengeAverted(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubChallengeSucceededEvent>(
				mintingHubContract,
				mintingHubContract.filters.ChallengeSucceeded(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubPostponedReturnEvent>(
				mintingHubContract,
				mintingHubContract.filters.PostponedReturn(),
				fromBlock,
				toBlock,
				this.logger
			),
			fetchEvents<MintingHubForcedSaleEvent>(
				mintingHubContract,
				mintingHubContract.filters.ForcedSale(),
				fromBlock,
				toBlock,
				this.logger
			),
		]);

		// Persist events
		await this.persistEvents({
			mintingHubChallengeStartedEvents,
			mintingHubChallengeAvertedEvents,
			mintingHubChallengeSucceededEvents,
			mintingHubPostponedReturnEvents,
			mintingHubForcedSaleEvents,
		});

		return {
			mintingHubChallengeStartedEvents,
			mintingHubChallengeAvertedEvents,
			mintingHubChallengeSucceededEvents,
			mintingHubPostponedReturnEvents,
			mintingHubForcedSaleEvents,
		};
	}

	private async persistEvents(eventsData: ChallengeEventsData): Promise<void> {
		await this.eventPersistenceService.persistAllEvents(eventsData);
	}
}

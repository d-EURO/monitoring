import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DeuroMinterAppliedEvent, DeuroMinterDeniedEvent } from '../../common/dto';
import { fetchEvents } from '../../blockchain/utils/utils';
import { EventPersistenceService } from '../../database/event-persistence.service';

export interface MintersEventsData {
	deuroMinterAppliedEvents: DeuroMinterAppliedEvent[];
	deuroMinterDeniedEvents: DeuroMinterDeniedEvent[];
}

@Injectable()
export class MintersEventsService {
	private readonly logger = new Logger(MintersEventsService.name);

	constructor(private readonly eventPersistenceService: EventPersistenceService) {}

	async getMintersEvents(deuroContract: ethers.Contract, fromBlock: number, toBlock: number): Promise<MintersEventsData> {
		this.logger.log(`Fetching minters events from block ${fromBlock} to ${toBlock}`);

		const [deuroMinterAppliedEvents, deuroMinterDeniedEvents] = await Promise.all([
			fetchEvents<DeuroMinterAppliedEvent>(deuroContract, deuroContract.filters.MinterApplied(), fromBlock, toBlock, this.logger),
			fetchEvents<DeuroMinterDeniedEvent>(deuroContract, deuroContract.filters.MinterDenied(), fromBlock, toBlock, this.logger),
		]);

		// Persist events
		await this.persistEvents({
			deuroMinterAppliedEvents,
			deuroMinterDeniedEvents,
		});

		return {
			deuroMinterAppliedEvents,
			deuroMinterDeniedEvents,
		};
	}

	private async persistEvents(eventsData: MintersEventsData): Promise<void> {
		this.logger.log('Persisting minters events to database...');
		await this.eventPersistenceService.persistAllEvents(eventsData);
		this.logger.log('Minters events persisted successfully');
	}
}

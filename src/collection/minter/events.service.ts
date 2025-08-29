import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DeuroMinterAppliedEvent, DeuroMinterDeniedEvent } from '../../common/dto';
import { fetchEvents } from '../../blockchain/utils/utils';
import { EventPersistenceService } from '../../database/event-persistence.service';

export interface MinterEventsData {
	deuroMinterAppliedEvents: DeuroMinterAppliedEvent[];
	deuroMinterDeniedEvents: DeuroMinterDeniedEvent[];
}

@Injectable()
export class MinterEventsService {
	private readonly logger = new Logger(MinterEventsService.name);

	constructor(private readonly eventPersistenceService: EventPersistenceService) {}

	async getMintersEvents(deuroContract: ethers.Contract, fromBlock: number, toBlock: number): Promise<MinterEventsData> {

		const [deuroMinterAppliedEvents, deuroMinterDeniedEvents] = await Promise.all([
			fetchEvents<DeuroMinterAppliedEvent>(deuroContract, deuroContract.filters.MinterApplied(), fromBlock, toBlock, this.logger),
			fetchEvents<DeuroMinterDeniedEvent>(deuroContract, deuroContract.filters.MinterDenied(), fromBlock, toBlock, this.logger),
		]);

		// Persist events
		await this.persistEvents({ deuroMinterAppliedEvents, deuroMinterDeniedEvents });
		return { deuroMinterAppliedEvents, deuroMinterDeniedEvents };
	}

	private async persistEvents(eventsData: MinterEventsData): Promise<void> {
		await this.eventPersistenceService.persistAllEvents(eventsData);
	}
}

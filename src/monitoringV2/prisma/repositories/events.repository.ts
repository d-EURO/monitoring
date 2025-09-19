import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientService } from '../client.service';
import { Event, PositionOpenedEvent, MinterAppliedEvent, ChallengeStartedEvent } from '../../types';

@Injectable()
export class EventsRepository {
	private readonly logger = new Logger(EventsRepository.name);

	constructor(private readonly prisma: PrismaClientService) {}

	async createMany(events: Event[]): Promise<void> {
		if (events.length === 0) return;

		try {
			await this.prisma.rawEvent.createMany({
				data: events.map((e) => ({
					...e,
					contractAddress: e.contractAddress.toLowerCase(),
				})),
				skipDuplicates: true,
			});

			this.logger.log(`Successfully persisted ${events.length} raw events`);
		} catch (error) {
			this.logger.error(`Failed to persist raw events: ${error.message}`);
			throw error;
		}
	}

	async getCollateralTokens(): Promise<string[]> {
		try {
			const events = await this.prisma.rawEvent.findMany({
				where: { topic: 'PositionOpened' },
				select: { args: true },
			});

			const collateralAddresses = events.map((e) => (e.args as any)?.collateral?.toLowerCase()).filter(Boolean); // Remove any undefined/null values

			return Array.from(new Set(collateralAddresses));
		} catch (error) {
			this.logger.error(`Failed to get collateral tokens: ${error.message}`);
			throw error;
		}
	}

	async getPositions(): Promise<PositionOpenedEvent[]> {
		try {
			const events = await this.prisma.rawEvent.findMany({
				where: { topic: 'PositionOpened' },
				select: { args: true, timestamp: true },
				orderBy: { timestamp: 'asc' },
			});

			return events.map((e) => {
				const data = e.args as any;
				return {
					address: data.position?.toLowerCase(),
					owner: data.owner?.toLowerCase(),
					original: data.original?.toLowerCase(),
					collateral: data.collateral?.toLowerCase(),
					timestamp: e.timestamp,
				};
			});
		} catch (error) {
			this.logger.error(`Failed to get positions from PositionOpened events: ${error.message}`);
			throw error;
		}
	}

	async getChallengeStartedEvents(): Promise<ChallengeStartedEvent[]> {
		try {
			const events = await this.prisma.rawEvent.findMany({
				where: { topic: 'ChallengeStarted' },
				select: { args: true, blockNumber: true, timestamp: true },
				orderBy: { timestamp: 'asc' },
			});

			return events
				.map((event) => {
					const data = event.args as any;
					return {
						challengeId: data.number ? Number(data.number) : undefined,
						challenger: data.challenger?.toLowerCase(),
						position: data.position?.toLowerCase(),
						size: data.size ? BigInt(data.size) : undefined,
						timestamp: event.timestamp,
					};
				})
				.filter((c) => c.challengeId !== undefined);
		} catch (error) {
			this.logger.error(`Failed to get challenge started events: ${error.message}`);
			throw error;
		}
	}
}

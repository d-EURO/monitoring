import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientService } from '../client.service';
import {
	Event,
	PositionEntity as PositionOpenedEvent,
	MinterEntity as MinterAppliedEvent,
	ChallengeEntity as ChallengeStartedEvent,
} from '../../types';

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

			const collateralAddresses = events
				.map((e) => (e.args as any)?.collateral?.toLowerCase())
				.filter(Boolean); // Remove any undefined/null values

			return Array.from(new Set(collateralAddresses));
		} catch (error) {
			this.logger.error(`Failed to get collateral tokens: ${error.message}`);
			throw error;
		}
	}

	async getPositionEntities(): Promise<PositionOpenedEvent[]> {
		try {
			const events = await this.prisma.rawEvent.findMany({
				where: { topic: 'PositionOpened' },
				select: { args: true, blockNumber: true },
				orderBy: { blockNumber: 'asc' },
			});

			return events.map((e) => {
				const data = e.args as any;
				return {
					address: data.position?.toLowerCase(),
					owner: data.owner?.toLowerCase(),
					original: data.original?.toLowerCase(),
					collateral: data.collateral?.toLowerCase(),
					openedAtBlock: e.blockNumber,
				};
			});
		} catch (error) {
			this.logger.error(`Failed to get position entities: ${error.message}`);
			throw error;
		}
	}

	async getMinterEntities(): Promise<MinterAppliedEvent[]> {
		try {
			const events = await this.prisma.rawEvent.findMany({
				where: { topic: 'MinterApplied' },
				select: { args: true, blockNumber: true },
				orderBy: { blockNumber: 'asc' },
			});

			return events
				.map((event) => {
					const data = event.args as any;
					return {
						address: data.minter?.toLowerCase(),
						appliedAtBlock: event.blockNumber,
						applicationPeriod: data.applicationPeriod ? BigInt(data.applicationPeriod) : undefined,
						applicationFee: data.applicationFee ? BigInt(data.applicationFee) : undefined,
					};
				})
				.filter((m) => m.address);
		} catch (error) {
			this.logger.error(`Failed to get minter entities: ${error.message}`);
			throw error;
		}
	}

	async getChallengeEntities(): Promise<ChallengeStartedEvent[]> {
		try {
			const events = await this.prisma.rawEvent.findMany({
				where: { topic: 'ChallengeStarted' },
				select: { args: true, blockNumber: true },
				orderBy: { blockNumber: 'asc' },
			});

			return events
				.map((event) => {
					const data = event.args as any;
					return {
						position: data.position?.toLowerCase(),
						challenger: data.challenger?.toLowerCase(),
						startedAtBlock: event.blockNumber,
						size: data.size ? BigInt(data.size) : undefined,
						liqPrice: data.liqPrice ? BigInt(data.liqPrice) : undefined,
					};
				})
				.filter((c) => c.position);
		} catch (error) {
			this.logger.error(`Failed to get challenge entities: ${error.message}`);
			throw error;
		}
	}

	// TODO: Where is this used?
	async withTransaction<T>(fn: (repository: EventsRepository) => Promise<T>): Promise<T> {
		return this.prisma.withTransaction(async (prisma) => {
			const tempRepo = new EventsRepository(prisma as PrismaClientService);
			return fn(tempRepo);
		});
	}
}

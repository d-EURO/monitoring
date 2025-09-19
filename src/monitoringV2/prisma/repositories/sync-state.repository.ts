import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientService } from '../client.service';

@Injectable()
export class SyncStateRepository {
	private readonly logger = new Logger(SyncStateRepository.name);

	constructor(private readonly prisma: PrismaClientService) {}

	async getLastProcessedBlock(): Promise<number | null> {
		const syncState = await this.prisma.syncState.findUnique({
			where: { id: 1 },
			select: { lastProcessedBlock: true },
		});

		const blockNumber = syncState ? syncState.lastProcessedBlock : null;
		this.logger.debug(`Retrieved last processed block: ${blockNumber}`);
		return blockNumber;
	}

	async updateLastProcessedBlock(blockNumber: number): Promise<void> {
		try {
			await this.prisma.syncState.upsert({
				where: { id: 1 },
				create: {
					id: 1,
					lastProcessedBlock: blockNumber,
					updatedAt: new Date(),
				},
				update: {
					lastProcessedBlock: blockNumber,
					updatedAt: new Date(),
				},
			});

			this.logger.debug(`Updated last processed block to: ${blockNumber}`);
		} catch (error) {
			this.logger.error(`Failed to update last processed block: ${error.message}`);
			throw error;
		}
	}
}

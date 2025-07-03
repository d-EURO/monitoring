import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { EventsService } from './events/events.service';
import { StatesService } from './states/states.service';
import { SystemEventsData } from '../common/dto';

@Injectable()
export class MonitoringService implements OnModuleInit {
	private readonly logger = new Logger(MonitoringService.name);
	private isMonitoring = false;
	private monitoringTimeoutCount = 0;
	private readonly INDEXING_TIMEOUT_COUNT = 3;

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly blockchainService: BlockchainService,
		private readonly eventsService: EventsService,
		private readonly statesService: StatesService
	) {}

	async onModuleInit() {
		this.logger.log('Monitoring service initialized');
		setTimeout(() => this.runMonitoringCycle(), 5000);
	}

	@Cron(CronExpression.EVERY_5_MINUTES)
	async scheduledMonitoring() {
		await this.runMonitoringCycle();
	}

	async runMonitoringCycle(): Promise<void> {
		if (this.isMonitoring) {
			this.monitoringTimeoutCount++;
			if (this.monitoringTimeoutCount >= this.INDEXING_TIMEOUT_COUNT) {
				this.logger.warn('Monitoring cycle timeout detected, resetting...');
				this.isMonitoring = false;
				this.monitoringTimeoutCount = 0;
			}
			return;
		}

		this.isMonitoring = true;
		this.monitoringTimeoutCount = 0;

		const startTime = Date.now();
		let blocksProcessed = 0;
		let success = false;
		let errorMessage: string | undefined;

		try {
			const provider = this.blockchainService.getProvider();
			const currentBlock = await provider.getBlockNumber();
			const lastProcessedBlock = await this.databaseService.getLastProcessedBlock();
			const fromBlock = lastProcessedBlock ? lastProcessedBlock + 1 : this.blockchainService.getDeploymentBlock();

			if (fromBlock <= currentBlock) {
				const timestamp = new Date().toISOString();
				this.logger.log(`[${timestamp}] Fetching system state from block ${fromBlock} to ${currentBlock}`);

				const eventsData = await this.eventsService.getSystemEvents(fromBlock, currentBlock);
				await this.statesService.getSystemState(eventsData.mintingHubPositionOpenedEvents);

				success = true;
				blocksProcessed = currentBlock - fromBlock + 1;
				const duration = Date.now() - startTime;
				await this.recordMonitoringCycle(fromBlock, currentBlock, eventsData, duration);
			} else {
				const timestamp = new Date().toISOString();
				this.logger.log(`[${timestamp}] No new blocks to process (${fromBlock}/${currentBlock})`);
				success = true;
			}
		} catch (error) {
			success = false;
			errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error('Error during monitoring cycle:', error);
		} finally {
			this.isMonitoring = false;
		}
	}

	async getMonitoringStatus() {
		const lastProcessedBlock = await this.databaseService.getLastProcessedBlock();
		const currentBlock = await this.blockchainService.getProvider().getBlockNumber();

		return {
			isMonitoring: this.isMonitoring,
			lastProcessedBlock,
			currentBlock,
			blockLag: currentBlock - (lastProcessedBlock || 0),
			timeoutCount: this.monitoringTimeoutCount,
		};
	}

	private async recordMonitoringCycle(fromBlock: number, toBlock: number, eventsData: SystemEventsData, duration: number): Promise<void> {
		const totalEvents = Object.entries(eventsData).reduce((sum, [key, value]) => {
			if (key === 'lastEventFetch' || key === 'blockRange') return sum;
			return sum + (Array.isArray(value) ? value.length : 0);
		}, 0);

		await this.databaseService.recordMonitoringCycle(toBlock, totalEvents, duration);
		this.logger.log(
			`Monitoring cycle completed successfully in ${duration}ms - processed ${totalEvents} events across ${toBlock - fromBlock + 1} blocks`
		);
	}
}

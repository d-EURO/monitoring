import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { EventsService } from '../events/events.service';
import { StatesService } from '../states/states.service';

@Injectable()
export class MonitoringService implements OnModuleInit {
	private readonly logger = new Logger(MonitoringService.name);
	private isMonitoring = false;
	private monitoringTimeoutCount = 0;
	private readonly INDEXING_TIMEOUT_COUNT = 3;

	constructor(
		private readonly configService: ConfigService,
		private readonly databaseService: DatabaseService,
		private readonly blockchainService: BlockchainService,
		private readonly eventsService: EventsService,
		private readonly statesService: StatesService
	) {}

	async onModuleInit() {
		this.logger.log('Monitoring service initialized');
		// Run initial monitoring cycle after a short delay
		setTimeout(() => this.runMonitoringCycle(), 5000);
	}

	@Interval(300000) // 5 minutes - will be configurable
	async scheduledMonitoring() {
		const monitoringConfig = this.configService.get('monitoring');
		const _intervalMs = monitoringConfig.monitorIntervalMs || 300000; // eslint-disable-line @typescript-eslint/no-unused-vars

		// Dynamic interval adjustment (this is a simplified approach)
		// In a real implementation, you might want to use a more sophisticated scheduler
		await this.runMonitoringCycle();
	}

	@Cron('0 0 * * *') // Daily at midnight
	async dailyMaintenance() {
		this.logger.log('Running daily maintenance tasks...');

		try {
			// Archive old monitoring metadata (keep last 30 days)
			await this.databaseService.query(`
        DELETE FROM monitoring_metadata 
        WHERE cycle_timestamp < NOW() - INTERVAL '30 days'
      `);

			// Analyze database tables for performance
			await this.databaseService.query('ANALYZE');

			this.logger.log('Daily maintenance completed successfully');
		} catch (error) {
			this.logger.error('Daily maintenance failed:', error);
		}
	}

	@Cron('0 */6 * * *') // Every 6 hours
	async aggregateMetrics() {
		this.logger.log('Running metrics aggregation...');

		try {
			// Could add logic here for calculating daily/weekly summaries
			// For now, this is a placeholder for future analytics

			this.logger.log('Metrics aggregation completed');
		} catch (error) {
			this.logger.error('Metrics aggregation failed:', error);
		}
	}

	@Cron(CronExpression.EVERY_WEEK) // Weekly health check
	async weeklyHealthCheck() {
		this.logger.log('Running weekly health check...');

		try {
			// Check database connection health
			const dbHealthy = await this.databaseService.testConnection();

			// Check if monitoring is running properly
			const lastProcessedBlock = await this.databaseService.getLastProcessedBlock();
			const currentBlock = await this.blockchainService.getProvider().getBlockNumber();

			const blockLag = currentBlock - (lastProcessedBlock || 0);

			if (blockLag > 1000) {
				this.logger.warn(`High block lag detected: ${blockLag} blocks behind`);
			}

			this.logger.log(`Weekly health check completed - DB: ${dbHealthy}, Block lag: ${blockLag}`);
		} catch (error) {
			this.logger.error('Weekly health check failed:', error);
		}
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

		try {
			const startTime = Date.now();
			const provider = this.blockchainService.getProvider();
			const currentBlock = await provider.getBlockNumber();
			const lastProcessedBlock = await this.databaseService.getLastProcessedBlock();
			const fromBlock = lastProcessedBlock ? lastProcessedBlock + 1 : this.blockchainService.getDeploymentBlock();

			if (fromBlock <= currentBlock) {
				const timestamp = new Date().toISOString();
				this.logger.log(`[${timestamp}] Fetching system state from block ${fromBlock} to ${currentBlock}`);

				// Fetch and process events
				const eventsData = await this.eventsService.getSystemEvents(fromBlock, currentBlock);

				// Fetch and process states
				await this.statesService.getSystemState(eventsData.mintingHubPositionOpenedEvents);

				const duration = Date.now() - startTime;
				this.logger.log(`Monitoring cycle completed in ${duration}ms`);
			} else {
				const timestamp = new Date().toISOString();
				this.logger.log(`[${timestamp}] No new blocks to process (${fromBlock}/${currentBlock})`);
			}
		} catch (error) {
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
}

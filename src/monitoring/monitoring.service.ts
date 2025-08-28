import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { ProviderService } from '../blockchain/provider.service';
import { ContractRegistryService } from './contract-registry.service';
import { EventCollectorService } from './event-collector.service';
import { StateUpdaterService } from './state-updater.service';

export enum MonitoringStatus {
	IDLE = 'IDLE',
	PROCESSING = 'PROCESSING',
	ERROR = 'ERROR',
}

@Injectable()
export class MonitoringService implements OnModuleInit {
	private readonly logger = new Logger(MonitoringService.name);
	private isMonitoring = false;
	private monitoringStatus: MonitoringStatus = MonitoringStatus.IDLE;
	private lastError: string | null = null;
	private readonly MAX_BLOCKS_PER_BATCH = 500;

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly providerService: ProviderService,
		private readonly contractRegistry: ContractRegistryService,
		private readonly eventCollector: EventCollectorService,
		private readonly stateUpdater: StateUpdaterService
	) {}

	async onModuleInit() {
		this.logger.log('Monitoring service initializing...');

		// Initialize contract registry with core contracts
		await this.contractRegistry.initialize();

		// Start monitoring after a short delay
		setTimeout(() => this.runMonitoringCycle(), 5000);
	}

	@Cron(CronExpression.EVERY_5_MINUTES)
	async scheduledMonitoring() {
		await this.runMonitoringCycle();
	}

	async runMonitoringCycle(): Promise<void> {
		if (this.isMonitoring) {
			this.logger.warn('Monitoring cycle already in progress, skipping');
			return;
		}

		this.isMonitoring = true;
		this.monitoringStatus = MonitoringStatus.PROCESSING;
		this.lastError = null;

		const startTime = Date.now();

		try {
			const provider = this.providerService.getProvider();
			const currentBlock = await provider.getBlockNumber();
			const lastProcessedBlock = await this.getLastProcessedBlock();
			const fromBlock = lastProcessedBlock + 1;

			if (fromBlock > currentBlock) {
				const timestamp = new Date().toISOString();
				this.logger.log(`[${timestamp}] No new blocks to process (${fromBlock}/${currentBlock})`);
				this.monitoringStatus = MonitoringStatus.IDLE;
				return;
			}

			// Process blocks in batches
			let batchStart = fromBlock;
			const totalBlocks = currentBlock - fromBlock + 1;
			let processedBlocks = 0;

			this.logger.log(`Starting to process ${totalBlocks} blocks from ${fromBlock} to ${currentBlock}`);

			while (batchStart <= currentBlock) {
				const batchEnd = Math.min(batchStart + this.MAX_BLOCKS_PER_BATCH - 1, currentBlock);
				const timestamp = new Date().toISOString();

				this.logger.log(
					`[${timestamp}] Processing batch: blocks ${batchStart}-${batchEnd} ` +
						`(${processedBlocks}/${totalBlocks} blocks processed)`
				);

				try {
					const events = await this.eventCollector.collectEvents(batchStart, batchEnd);

					// Update states every 10,000 blocks during sync, or when reaching current block
					const lastUpdateBlock = Math.floor((batchStart - 1) / 10000) * 10000;
					const currentUpdateBlock = Math.floor(batchEnd / 10000) * 10000;
					if (currentUpdateBlock > lastUpdateBlock || batchEnd === currentBlock) {
						await this.stateUpdater.updateStates(batchEnd);
					}

					await this.updateSyncState(batchEnd);

					processedBlocks += batchEnd - batchStart + 1;
					batchStart = batchEnd + 1;
					await this.recordMonitoringCycle(batchEnd, events.length, Date.now() - startTime);
				} catch (error) {
					this.logger.error(`Error processing batch ${batchStart}-${batchEnd}:`, error);

					// Try with smaller batch size
					if (batchEnd - batchStart > 0) {
						const smallerBatchEnd = batchStart + Math.floor((batchEnd - batchStart) / 2);
						this.logger.log(`Retrying with smaller batch: ${batchStart}-${smallerBatchEnd}`);
						batchStart = smallerBatchEnd + 1;
					} else {
						// Skip this single block if it fails
						this.logger.error(`Skipping block ${batchStart} after failure`);
						batchStart++;
					}
				}
			}

			const duration = Date.now() - startTime;
			this.logger.log(`Monitoring cycle complete: processed ${processedBlocks} blocks in ${duration}ms`);
			this.monitoringStatus = MonitoringStatus.IDLE;
		} catch (error) {
			this.logger.error('Error during monitoring cycle:', error);
			this.monitoringStatus = MonitoringStatus.ERROR;
			this.lastError = error instanceof Error ? error.message : String(error);
		} finally {
			this.isMonitoring = false;
		}
	}

	/**
	 * Get monitoring status
	 */
	getStatus(): { status: MonitoringStatus; lastError: string | null } {
		return {
			status: this.monitoringStatus,
			lastError: this.lastError,
		};
	}

	/**
	 * Get the last processed block from database
	 */
	private async getLastProcessedBlock(): Promise<number> {
		const result = await this.databaseService.query('SELECT last_processed_block FROM sync_state WHERE id = 1');

		if (result.rows.length > 0) {
			return parseInt(result.rows[0].last_processed_block);
		}

		// If no sync state, use deployment block
		const deploymentBlock = this.providerService.getDeploymentBlock();
		await this.databaseService.query('INSERT INTO sync_state (id, last_processed_block) VALUES (1, $1) ON CONFLICT (id) DO NOTHING', [
			deploymentBlock,
		]);
		return deploymentBlock;
	}

	/**
	 * Update the sync state with the last processed block
	 */
	private async updateSyncState(blockNumber: number): Promise<void> {
		await this.databaseService.query('UPDATE sync_state SET last_processed_block = $1, updated_at = NOW() WHERE id = 1', [blockNumber]);
	}

	/**
	 * Record monitoring cycle metadata
	 */
	private async recordMonitoringCycle(lastProcessedBlock: number, eventsProcessed: number, durationMs: number): Promise<void> {
		// Metrics are now logged instead of stored in database
		this.logger.log(`Processed block ${lastProcessedBlock}: ${eventsProcessed} events in ${durationMs}ms`);
	}

	/**
	 * Force a full state update (useful for debugging or recovery)
	 */
	async forceStateUpdate(): Promise<void> {
		const provider = this.providerService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		this.logger.log(`Forcing state update at block ${currentBlock}`);
		await this.stateUpdater.updateStates(currentBlock);
		this.logger.log('Force state update complete');
	}

	/**
	 * Get monitoring statistics
	 */
	async getStatistics(): Promise<any> {
		const [syncState, eventStats, contractStats] = await Promise.all([
			this.databaseService.query('SELECT * FROM sync_state WHERE id = 1'),
			this.databaseService.query(`
				SELECT 
					COUNT(*) as total_events,
					COUNT(DISTINCT event_name) as unique_event_types,
					COUNT(DISTINCT contract_address) as unique_contracts,
					MIN(block_number) as first_block,
					MAX(block_number) as last_block,
					MIN(timestamp) as first_event_time,
					MAX(timestamp) as last_event_time
				FROM raw_events
			`),
			this.databaseService.query(`
				SELECT 
					contract_type,
					COUNT(*) as count
				FROM contracts
				WHERE is_active = true
				GROUP BY contract_type
			`),
		]);

		return {
			syncState: syncState.rows[0],
			eventStatistics: eventStats.rows[0],
			contractTypes: contractStats.rows,
		};
	}
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { BlockchainService } from '../blockchain/blockchain.service';

// Domain services
import { DeuroEventsService } from './deuro/events.service';
import { DeuroStatesService } from './deuro/states.service';
import { PositionEventsService } from './position/events.service';
import { PositionStatesService } from './position/states.service';
import { ChallengeEventsService } from './challenge/events.service';
import { ChallengeStatesService } from './challenge/states.service';
import { MinterEventsService } from './minter/events.service';
import { MinterStatesService } from './minter/states.service';
import { CollateralStatesService } from './collateral/states.service';

@Injectable()
export class MonitoringService implements OnModuleInit {
	private readonly logger = new Logger(MonitoringService.name);
	private isMonitoring = false;
	private monitoringTimeoutCount = 0;
	private readonly INDEXING_TIMEOUT_COUNT = 3;
	private readonly MAX_BLOCKS_PER_BATCH = 500; // Process max 500 blocks at a time

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly blockchainService: BlockchainService,
		private readonly deuroEventsService: DeuroEventsService,
		private readonly deuroStateService: DeuroStatesService,
		private readonly positionEventsService: PositionEventsService,
		private readonly positionStatesService: PositionStatesService,
		private readonly collateralStatesService: CollateralStatesService,
		private readonly challengeEventsService: ChallengeEventsService,
		private readonly challengeStatesService: ChallengeStatesService,
		private readonly minterEventsService: MinterEventsService,
		private readonly minterStatesService: MinterStatesService
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

		try {
			const provider = this.blockchainService.getProvider();
			const currentBlock = await provider.getBlockNumber();
			const lastProcessedBlock = await this.databaseService.getLastProcessedBlock();
			const fromBlock = lastProcessedBlock ? Number(lastProcessedBlock) + 1 : this.blockchainService.getDeploymentBlock();

			if (fromBlock <= currentBlock) {
				// Process blocks in smaller batches
				let batchStart = fromBlock;
				const totalBlocks = currentBlock - fromBlock + 1;
				let processedBlocks = 0;

				while (batchStart <= currentBlock) {
					const batchEnd = Math.min(batchStart + this.MAX_BLOCKS_PER_BATCH - 1, currentBlock);
					const timestamp = new Date().toISOString();
					
					this.logger.log(
						`[${timestamp}] Processing batch: blocks ${batchStart}-${batchEnd} ` +
						`(${processedBlocks}/${totalBlocks} blocks processed)`
					);

					try {
						const contracts = this.blockchainService.getContracts();

						// Fetch all events in parallel for this batch
						const [_deuroEvents, positionsEvents, _challengeEvents, _minterEvents] = await Promise.all([
							this.deuroEventsService.getDeuroEvents(contracts, batchStart, batchEnd),
							this.positionEventsService.getPositionsEvents(contracts, provider, batchStart, batchEnd),
							this.challengeEventsService.getChallengesEvents(contracts.mintingHubContract, batchStart, batchEnd),
							this.minterEventsService.getMintersEvents(contracts.deuroContract, batchStart, batchEnd),
						]);

						// Only fetch states at the end of each batch (not for every block)
						if (batchEnd === currentBlock) {
							// Fetch current state at the final block
							const positionsState = await this.positionStatesService.getPositionsState(provider);
							
							const [deuroState, collateralState, challengesState, mintersState] = await Promise.all([
								this.deuroStateService.getDeuroState(contracts),
								this.collateralStatesService.getCollateralState(positionsEvents.mintingHubPositionOpenedEvents, provider, positionsState),
								this.challengeStatesService.getChallengesState(contracts.mintingHubContract, positionsState),
								this.minterStatesService.getMintersState(provider),
							]);

							// Persist states in a transaction
							await this.databaseService.withTransaction(async (client) => {
								await this.deuroStateService.persistDeuroState(client, deuroState, batchEnd);
								await this.positionStatesService.persistPositionsState(client, positionsState, batchEnd);
								await this.collateralStatesService.persistCollateralState(client, collateralState, batchEnd);
								await this.challengeStatesService.persistChallengesState(client, challengesState, batchEnd);
								await this.minterStatesService.persistFullMintersState(client, mintersState, batchEnd);
							});
						}

						// Update last processed block after each successful batch
						await this.databaseService.updateLastProcessedBlock(null, batchEnd);
						processedBlocks += (batchEnd - batchStart + 1);
						
						this.logger.log(`Successfully processed batch up to block ${batchEnd}`);
					} catch (error) {
						this.logger.error(`Failed to process batch ${batchStart}-${batchEnd}:`, error);
						// Stop processing on error but keep progress
						break;
					}

					batchStart = batchEnd + 1;
				}

				await this.recordMonitoringCycle(fromBlock, currentBlock, Date.now() - startTime);
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

	private async recordMonitoringCycle(fromBlock: number, toBlock: number, duration: number): Promise<void> {
		const eventsProcessed = toBlock - fromBlock + 1;
		await this.databaseService.query(
			`INSERT INTO monitoring_metadata (last_processed_block, events_processed, processing_duration_ms)
			 VALUES ($1, $2, $3)`,
			[toBlock, eventsProcessed, duration]
		);
	}
}

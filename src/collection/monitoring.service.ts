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
			const fromBlock = lastProcessedBlock ? lastProcessedBlock + 1 : this.blockchainService.getDeploymentBlock();

			if (fromBlock <= currentBlock) {
				const timestamp = new Date().toISOString();
				this.logger.log(`[${timestamp}] Fetching system state from block ${fromBlock} to ${currentBlock}`);
				const contracts = this.blockchainService.getContracts();

				// Fetch all events in parallel
				const [_deuroEvents, positionsEvents, _challengeEvents, _minterEvents] = await Promise.all([
					this.deuroEventsService.getDeuroEvents(contracts, fromBlock, currentBlock),
					this.positionEventsService.getPositionsEvents(contracts, provider, fromBlock, currentBlock),
					this.challengeEventsService.getChallengesEvents(contracts.mintingHubContract, fromBlock, currentBlock),
					this.minterEventsService.getMintersEvents(contracts.deuroContract, fromBlock, currentBlock),
				]);

				// Fetch position state first as it's needed by challenge state
				const positionsState = await this.positionStatesService.getPositionsState(provider);
				
				// Fetch remaining states in parallel
				const [deuroState, collateralState, challengesState, mintersState] = await Promise.all([
					this.deuroStateService.getDeuroState(contracts),
					this.collateralStatesService.getCollateralState(positionsEvents.mintingHubPositionOpenedEvents, provider),
					this.challengeStatesService.getChallengesState(contracts.mintingHubContract, positionsState),
					this.minterStatesService.getMintersState(provider),
				]);

				// Persist everything in a single atomic transaction
				await this.databaseService.withTransaction(async (client) => {
					await this.deuroStateService.persistDeuroState(client, deuroState, currentBlock);
					await this.positionStatesService.persistPositionsState(client, positionsState, currentBlock);
					await this.collateralStatesService.persistCollateralState(client, collateralState, currentBlock);
					await this.challengeStatesService.persistChallengesState(client, challengesState, currentBlock);
					await this.minterStatesService.persistFullMintersState(client, mintersState, currentBlock);

					// Only update last processed block after all states are successfully saved
					await this.databaseService.updateLastProcessedBlock(client, currentBlock);
				});

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

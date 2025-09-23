import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProviderService } from './provider.service';
import { ContractService } from './contract.service';
import { AppConfigService } from 'src/config/config.service';
import { SyncStateRepository } from './prisma/repositories/sync-state.repository';
import { EventService } from './event.service';
import { TokenService } from './token.service';
import { PositionService } from './position.service';
import { ChallengeService } from './challenge.service';
import { CollateralService } from './collateral.service';
import { MinterService } from './minter.service';

@Injectable()
export class MonitoringService implements OnModuleInit {
	private isRunning = false;

	private readonly logger = new Logger(MonitoringService.name);

	constructor(
		private readonly config: AppConfigService,
		private readonly providerService: ProviderService,
		private readonly syncStateRepo: SyncStateRepository,
		private readonly contractService: ContractService,
		private readonly eventCollector: EventService,
		private readonly tokenService: TokenService,
		private readonly positionService: PositionService,
		private readonly challengeService: ChallengeService,
		private readonly collateralService: CollateralService,
		private readonly minterService: MinterService
	) {}

	async onModuleInit() {
		this.logger.log('Monitoring service initialized');
		await this.contractService.initialize();
		await this.tokenService.initialize();
		await this.positionService.initialize();
		await this.challengeService.initialize();
		await this.minterService.initialize();
		setTimeout(() => this.runMonitoring(), 5000);
	}

	@Cron(CronExpression.EVERY_5_MINUTES)
	async runMonitoring() {
		if (this.isRunning) {
			this.logger.warn('Monitoring cycle already running, skipping...');
			return;
		}

		this.isRunning = true;

		try {
			const { fromBlock, currentBlock } = await this.getBlockRangeToProcess();
			if (fromBlock > currentBlock) return;

			const startTime = Date.now();
			await this.processBlocks(fromBlock, currentBlock);
			this.logger.log(`Monitoring cycle completed in ${Date.now() - startTime}ms`);
		} catch (error) {
			this.logger.error(`Error occurred while processing blocks: ${error.message}`, error.stack);
		} finally {
			this.isRunning = false;
		}
	}

	private async processBlocks(fromBlock: number, currentBlock: number): Promise<void> {
		let batchStart = fromBlock;
		while (batchStart <= currentBlock) {
			const batchEnd = Math.min(batchStart + this.config.blockPerBatch - 1, currentBlock);
			await this.eventCollector.processEvents(batchStart, batchEnd);
			await this.syncStateRepo.updateLastProcessedBlock(batchEnd);
			batchStart = batchEnd + 1;

			const progress = ((batchEnd - fromBlock + 1) / (currentBlock - fromBlock + 1)) * 100;
			this.logger.log(`Sync progress: ${progress.toFixed(2)}% (${currentBlock - batchEnd} blocks remaining)`);
		}

		// Post-processing after all blocks are handled
		await this.tokenService.syncTokens(); // sync tokens (from positions and bridges)
		await this.tokenService.syncPrices(); // sync token prices
		await this.positionService.syncPositions(); // sync position states
		await this.challengeService.syncChallenges(); // sync challenge states
		await this.collateralService.syncCollaterals(); // sync collateral states
		await this.minterService.syncMinters(); // sync minter states
	}

	private async getBlockRangeToProcess(): Promise<{ fromBlock: number; currentBlock: number }> {
		const lastProcessedBlock = await this.syncStateRepo.getLastProcessedBlock();
		const fromBlock = (lastProcessedBlock ?? this.config.deploymentBlock) + 1;
		const currentBlock = await this.providerService.provider.getBlockNumber();

		this.logger.log(`${currentBlock - fromBlock + 1} new blocks to process: ${fromBlock} to ${currentBlock}`);
		return { fromBlock, currentBlock };
	}
}

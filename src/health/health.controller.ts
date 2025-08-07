import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { MonitoringService } from '../collection/monitoring.service';

export class HealthStatusDto {
	@ApiProperty({ description: 'Last block number processed by the monitoring service', nullable: true })
	lastProcessedBlock: number | null;

	@ApiProperty({ description: 'Current block number on the blockchain' })
	currentBlock: number;

	@ApiProperty({ description: 'Number of blocks behind the current blockchain state' })
	blockLag: number;

	@ApiProperty({ description: 'Monitoring service status', enum: ['idle', 'processing', 'error'] })
	monitoringStatus: 'idle' | 'processing' | 'error';

	@ApiProperty({ description: 'Synchronization progress percentage (0-100)' })
	syncProgress: number;

	@ApiProperty({ description: 'Last error message if status is error', required: false })
	lastError?: string;

	@ApiProperty({ description: 'Timestamp of the health check' })
	timestamp: Date;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly blockchainService: BlockchainService,
		private readonly monitoringService: MonitoringService
	) {}

	@Get()
	@ApiOkResponse({ type: HealthStatusDto })
	async health(): Promise<HealthStatusDto> {
		try {
			const lastBlock = await this.databaseService.getLastProcessedBlock();
			const currentBlock = await this.blockchainService.getProvider().getBlockNumber();
			const lag = currentBlock - (lastBlock || 0);
			const monitoringStatus = this.monitoringService.getStatus();
			
			// Calculate sync progress as percentage (0-100)
			const syncProgress = lastBlock 
				? Math.round((lastBlock / currentBlock) * 10000) / 100 
				: 0;

			const response: HealthStatusDto = {
				lastProcessedBlock: lastBlock,
				currentBlock,
				blockLag: lag,
				monitoringStatus: monitoringStatus.status,
				syncProgress,
				timestamp: new Date(),
			};

			// Only include lastError if there is one
			if (monitoringStatus.lastError) {
				response.lastError = monitoringStatus.lastError;
			}

			return response;
		} catch (error) {
			return {
				lastProcessedBlock: null,
				currentBlock: 0,
				blockLag: 0,
				monitoringStatus: 'error',
				syncProgress: 0,
				lastError: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date(),
			};
		}
	}
}

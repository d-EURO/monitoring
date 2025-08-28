import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { ProviderService } from '../blockchain/provider.service';
import { MonitoringService } from '../monitoring/monitoring.service';

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
		private readonly providerService: ProviderService,
		private readonly monitoringService: MonitoringService
	) {}

	@Get()
	@ApiOkResponse({ type: HealthStatusDto })
	async health(): Promise<HealthStatusDto> {
		try {
			// Get last processed block from sync_state table
			const result = await this.databaseService.query('SELECT last_processed_block FROM sync_state WHERE id = 1');
			const lastBlock = result.rows.length > 0 ? parseInt(result.rows[0].last_processed_block) : null;

			const currentBlock = await this.providerService.getProvider().getBlockNumber();
			const lag = currentBlock - (lastBlock || 0);
			const monitoringStatus = this.monitoringService.getStatus();

			// Calculate sync progress as percentage (0-100)
			const syncProgress = lastBlock ? Math.round((lastBlock / currentBlock) * 10000) / 100 : 0;

			// Map MonitoringStatus enum to the expected string values
			let statusString: 'idle' | 'processing' | 'error' = 'idle';
			if (monitoringStatus.status === 'PROCESSING') {
				statusString = 'processing';
			} else if (monitoringStatus.status === 'ERROR') {
				statusString = 'error';
			}

			const response: HealthStatusDto = {
				lastProcessedBlock: lastBlock,
				currentBlock,
				blockLag: lag,
				monitoringStatus: statusString,
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

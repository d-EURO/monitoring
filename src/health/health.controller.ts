import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { BlockchainService } from '../blockchain/blockchain.service';

export enum HealthStatusEnum {
	HEALTHY = 'healthy',
	UNHEALTHY = 'unhealthy',
}

export class HealthStatusDto {
	@ApiProperty({ description: 'Health status of the monitoring service', enum: HealthStatusEnum })
	status: HealthStatusEnum;

	@ApiProperty({ description: 'Last block number processed by the monitoring service', nullable: true })
	lastProcessedBlock: number | null;

	@ApiProperty({ description: 'Current block number on the blockchain' })
	currentBlock: number;

	@ApiProperty({ description: 'Number of blocks behind the current blockchain state' })
	blockLag: number;

	@ApiProperty({ description: 'Timestamp of the health check' })
	timestamp: Date;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
	constructor(
		private readonly databaseService: DatabaseService,
		private readonly blockchainService: BlockchainService
	) {}

	@Get()
	@ApiOkResponse({ type: HealthStatusDto })
	async health(): Promise<HealthStatusDto> {
		try {
			const lastBlock = await this.databaseService.getLastProcessedBlock();
			const currentBlock = await this.blockchainService.getProvider().getBlockNumber();
			const lag = currentBlock - (lastBlock || 0);

			return {
				status: lag > 100 ? HealthStatusEnum.UNHEALTHY : HealthStatusEnum.HEALTHY,
				lastProcessedBlock: lastBlock,
				currentBlock,
				blockLag: lag,
				timestamp: new Date(),
			};
		} catch (error) {
			// If we can't check status, we're unhealthy
			return {
				status: HealthStatusEnum.UNHEALTHY,
				lastProcessedBlock: null,
				currentBlock: 0,
				blockLag: 0,
				timestamp: new Date(),
			};
		}
	}
}

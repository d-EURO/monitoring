import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { DatabaseService } from '../database/database.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { HealthStatusDto } from './metrics.dto';

@ApiTags('Health')
@Controller('health')
export class MonitoringController {
	private readonly logger = new Logger(MonitoringController.name);

	constructor(
		private readonly monitoringService: MonitoringService,
		private readonly databaseService: DatabaseService,
		private readonly blockchainService: BlockchainService
	) {}

	@Get()
	@ApiOperation({ summary: 'Get system health status' })
	@ApiOkResponse({ type: HealthStatusDto })
	async getHealth(): Promise<HealthStatusDto> {
		const checks = await Promise.allSettled([this.checkDatabase(), this.checkBlockchain(), this.checkMonitoring()]);

		const [dbCheck, rpcCheck, monitoringCheck] = checks;

		const dbHealthy = dbCheck.status === 'fulfilled' && dbCheck.value;
		const rpcHealthy = rpcCheck.status === 'fulfilled' && rpcCheck.value;
		const monitoringHealthy = monitoringCheck.status === 'fulfilled' && monitoringCheck.value;

		const overallHealthy = dbHealthy && rpcHealthy && monitoringHealthy;

		return {
			status: overallHealthy ? 'healthy' : 'unhealthy',
			timestamp: new Date(),
			services: {
				database: dbHealthy,
				blockchain: rpcHealthy,
				monitoring: monitoringHealthy,
			},
			details: {
				database: dbCheck.status === 'rejected' ? dbCheck.reason?.message : 'connected',
				blockchain: rpcCheck.status === 'rejected' ? rpcCheck.reason?.message : 'connected',
				monitoring: monitoringCheck.status === 'rejected' ? monitoringCheck.reason?.message : 'running',
			},
		};
	}

	private async checkDatabase(): Promise<boolean> {
		try {
			return await this.databaseService.testConnection();
		} catch (error) {
			this.logger.error('Database health check failed', error);
			return false;
		}
	}

	private async checkBlockchain(): Promise<boolean> {
		try {
			await this.blockchainService.getProvider().getBlockNumber();
			return true;
		} catch (error) {
			this.logger.error('Blockchain health check failed', error);
			return false;
		}
	}

	private async checkMonitoring(): Promise<boolean> {
		try {
			const status = await this.monitoringService.getMonitoringStatus();
			return status.timeoutCount < 3;
		} catch (error) {
			this.logger.error('Monitoring health check failed', error);
			return false;
		}
	}
}

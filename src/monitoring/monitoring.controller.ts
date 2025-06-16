import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { DatabaseService } from '../database/database.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@ApiTags('Health')
@Controller('health')
export class MonitoringController {
	constructor(
		private readonly monitoringService: MonitoringService,
		private readonly databaseService: DatabaseService,
		private readonly blockchainService: BlockchainService
	) {}

	@Get()
	@ApiOperation({ summary: 'Get system health status' })
	@ApiResponse({
		status: 200,
		description: 'System health including database, blockchain, and monitoring status',
	})
	async getHealth() {
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
			return false;
		}
	}

	private async checkBlockchain(): Promise<boolean> {
		try {
			await this.blockchainService.getProvider().getBlockNumber();
			return true;
		} catch (error) {
			return false;
		}
	}

	private async checkMonitoring(): Promise<boolean> {
		try {
			const status = await this.monitoringService.getMonitoringStatus();
			// Consider monitoring healthy if not in a failed state
			return status.timeoutCount < 3;
		} catch (error) {
			return false;
		}
	}
}

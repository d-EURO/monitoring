import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AnalyticsService {
	private readonly logger = new Logger(AnalyticsService.name);

	constructor(private readonly databaseService: DatabaseService) {}

	async getProtocolSummary() {
		// Example aggregated metrics
		const queries = await Promise.all([
			this.getTotalTransactions(),
			this.getTotalVolume(),
			this.getActivePositions(),
			this.getTotalSavings(),
		]);

		return {
			totalTransactions: queries[0],
			totalVolume: queries[1],
			activePositions: queries[2],
			totalSavings: queries[3],
			lastUpdated: new Date().toISOString(),
		};
	}

	private async getTotalTransactions(): Promise<number> {
		const result = await this.databaseService.fetch(`
      SELECT COUNT(*) as count FROM deuro_transfer_events
    `);
		return parseInt(result[0]?.count || '0');
	}

	private async getTotalVolume(): Promise<string> {
		const result = await this.databaseService.fetch(`
      SELECT SUM(value) as total_volume FROM deuro_transfer_events
    `);
		return result[0]?.total_volume || '0';
	}

	private async getActivePositions(): Promise<number> {
		const result = await this.databaseService.fetch(`
      SELECT COUNT(*) as count FROM position_states WHERE is_closed = false
    `);
		return parseInt(result[0]?.count || '0');
	}

	private async getTotalSavings(): Promise<string> {
		const result = await this.databaseService.fetch(`
      SELECT SUM(amount) as total_savings FROM savings_saved_events
    `);
		return result[0]?.total_savings || '0';
	}

	async getVolumeMetrics(days: number = 30) {
		const query = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as transaction_count,
        SUM(value) as daily_volume
      FROM deuro_transfer_events 
      WHERE timestamp >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;

		return this.databaseService.fetch(query);
	}

	async getPositionMetrics() {
		const query = `
      SELECT 
        collateral_address,
        COUNT(*) as position_count,
        SUM(collateral_balance::numeric) as total_collateral
      FROM position_states 
      WHERE is_closed = false
      GROUP BY collateral_address
      ORDER BY position_count DESC
    `;

		return this.databaseService.fetch(query);
	}
}

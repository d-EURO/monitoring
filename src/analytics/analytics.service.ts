import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProtocolSummaryDto, PeriodAverageDto } from './analytics.dto';

@Injectable()
export class AnalyticsService {
	private readonly logger = new Logger(AnalyticsService.name);

	constructor(private readonly databaseService: DatabaseService) {}

	async getProtocolSummary(): Promise<ProtocolSummaryDto> {
		const [totalTransactions, totalVolume, activePositions, totalSavings, averageVolume] = await Promise.all([
			this.getTotalTransactions(),
			this.getTotalVolume(),
			this.getActivePositions(),
			this.getTotalSavings(),
			this.getAverageVolumes(),
		]);

		return {
			totalTransactions,
			totalVolume,
			activePositions,
			totalSavings,
			averageVolume,
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

	private async getAverageVolumes(): Promise<PeriodAverageDto> {
		const result = await this.databaseService.fetch(`
      SELECT 
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '1 day' THEN value ELSE 0 END) as volume_1d,
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN value ELSE 0 END) / 7 as avg_volume_7d,
        SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN value ELSE 0 END) / 30 as avg_volume_30d
      FROM deuro_transfer_events
    `);

		return {
			day: result[0]?.volume_1d || '0',
			week: result[0]?.avg_volume_7d || '0',
			month: result[0]?.avg_volume_30d || '0',
		};
	}
}

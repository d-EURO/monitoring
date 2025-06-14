import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
	constructor(private readonly analyticsService: AnalyticsService) {}

	@Get('summary')
	@ApiOperation({ summary: 'Get protocol summary analytics' })
	@ApiResponse({
		status: 200,
		description: 'High-level protocol metrics including transactions, volume, positions',
	})
	async getProtocolSummary() {
		return this.analyticsService.getProtocolSummary();
	}

	@Get('volume')
	@ApiOperation({ summary: 'Get volume metrics over time' })
	@ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 30)', type: Number })
	@ApiResponse({
		status: 200,
		description: 'Daily volume and transaction count metrics',
	})
	async getVolumeMetrics(@Query('days') days: number = 30) {
		return this.analyticsService.getVolumeMetrics(days);
	}

	@Get('positions')
	@ApiOperation({ summary: 'Get position distribution analytics' })
	@ApiResponse({
		status: 200,
		description: 'Position count and collateral distribution by type',
	})
	async getPositionMetrics() {
		return this.analyticsService.getPositionMetrics();
	}
}

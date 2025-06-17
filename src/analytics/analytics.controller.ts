import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { ProtocolSummaryDto, VolumeMetricDto, PositionMetricDto } from './analytics.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
	constructor(private readonly analyticsService: AnalyticsService) {}

	@Get('summary')
	@ApiOperation({ summary: 'Get protocol summary analytics' })
	@ApiOkResponse({ type: ProtocolSummaryDto })
	async getProtocolSummary(): Promise<ProtocolSummaryDto> {
		return this.analyticsService.getProtocolSummary();
	}

	@Get('volume')
	@ApiOperation({ summary: 'Get volume metrics over time' })
	@ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 30)', type: Number })
	@ApiOkResponse({ type: [VolumeMetricDto] })
	async getVolumeMetrics(@Query('days') days: number = 30): Promise<VolumeMetricDto[]> {
		return this.analyticsService.getVolumeMetrics(days);
	}

	@Get('positions')
	@ApiOperation({ summary: 'Get position distribution analytics' })
	@ApiOkResponse({ type: [PositionMetricDto] })
	async getPositionMetrics(): Promise<PositionMetricDto[]> {
		return this.analyticsService.getPositionMetrics();
	}
}

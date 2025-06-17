import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { ProtocolSummaryDto } from './analytics.dto';

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
}

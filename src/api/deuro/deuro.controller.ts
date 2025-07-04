import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { DeuroService } from './deuro.service';
import { DeuroStateDto } from './deuro.dto';

@ApiTags('dEURO')
@Controller('deuro')
export class DeuroController {
	constructor(private readonly deuroService: DeuroService) {}

	@Get()
	@ApiOkResponse({ type: DeuroStateDto })
	async getCurrentState(): Promise<DeuroStateDto | null> {
		return this.deuroService.getCurrentState();
	}

	@Get('history')
	@ApiQuery({ name: 'limit', type: 'number', required: false })
	@ApiOkResponse({ type: [DeuroStateDto] })
	async getHistoricalStates(@Query('limit') limit?: string): Promise<DeuroStateDto[]> {
		const parsedLimit = limit ? parseInt(limit, 10) : 100;
		return this.deuroService.getHistoricalStates(parsedLimit);
	}
}

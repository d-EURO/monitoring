import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { PositionService } from './position.service';
import { PositionStateDto } from '../../common/dto';

@ApiTags('Positions')
@Controller('positions')
export class PositionController {
	constructor(private readonly positionService: PositionService) {}

	@Get()
	@ApiQuery({ name: 'live', type: 'boolean', required: false })
	@ApiQuery({ name: 'collateral', type: 'string', required: false })
	@ApiOkResponse({ type: [PositionStateDto] })
	async getPositions(@Query('live') live?: string, @Query('collateral') collateral?: string): Promise<PositionStateDto[]> {
		return this.positionService.getPositions(live, collateral);
	}
}

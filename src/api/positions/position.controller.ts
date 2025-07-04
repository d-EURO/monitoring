import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { PositionRepository } from '../../database/repositories';
import { PositionStateDto } from '../../common/dto';

@ApiTags('Positions')
@Controller('positions')
export class PositionController {
	constructor(private readonly positionRepository: PositionRepository) {}

	@Get()
	@ApiQuery({ name: 'live', type: 'boolean', required: false })
	@ApiQuery({ name: 'collateral', type: 'string', required: false })
	@ApiOkResponse({ type: [PositionStateDto] })
	async getPositions(@Query('live') live?: string, @Query('collateral') collateral?: string): Promise<PositionStateDto[]> {
		if (collateral) return this.positionRepository.getPositionsByCollateral(collateral);
		if (live === 'true') return this.positionRepository.getLivePositions();
		return this.positionRepository.getAllPositions();
	}
}

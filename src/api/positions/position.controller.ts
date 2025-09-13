import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { PositionService } from './position.service';
import { PositionStateDto } from '../../common/dto';
import { BlockchainPositionsService } from './blockchain-positions.service';

@ApiTags('Positions')
@Controller('positions')
export class PositionController {
	constructor(
		private readonly positionService: PositionService,
		private readonly blockchainPositionsService: BlockchainPositionsService,
	) {}

	@Get()
	@ApiQuery({ name: 'live', type: 'boolean', required: false })
	@ApiQuery({ name: 'collateral', type: 'string', required: false })
	@ApiOkResponse({ type: [PositionStateDto] })
	async getPositions(@Query('live') live?: string, @Query('collateral') collateral?: string): Promise<PositionStateDto[]> {
		return this.positionService.getPositions(live, collateral);
	}

	@Get('total-count')
	@ApiOkResponse({ type: Number })
	async getTotalPositionsCount(): Promise<{ count: number }> {
		const count = await this.blockchainPositionsService.getTotalPositionsFromBlockchain();
		return { count };
	}
}

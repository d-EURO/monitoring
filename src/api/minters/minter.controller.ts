import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MinterService } from './minter.service';
import { MinterStatusDto, MinterStatusEnum } from '../../common/dto/minter.dto';

@ApiTags('Minters')
@Controller('minters')
export class MinterController {
	constructor(private readonly minterService: MinterService) {}

	@Get()
	@ApiOperation({ summary: 'Get minters' })
	@ApiQuery({ name: 'status', enum: MinterStatusEnum, required: false })
	@ApiOkResponse({ type: [MinterStatusDto], description: 'List of minters' })
	async getMinters(@Query('status') status?: MinterStatusEnum): Promise<MinterStatusDto[]> {
		if (status) return this.minterService.getMintersByStatus(status);
		return this.minterService.getAllMinters();
	}
}

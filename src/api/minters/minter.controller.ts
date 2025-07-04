import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { MinterService } from './minter.service';
import { MinterStateDto, MinterStatus } from '../../common/dto/minter.dto';
import { BridgeStateDto } from '../../common/dto/stablecoinBridge.dto';

@ApiTags('Minters')
@Controller('minters')
export class MinterController {
	constructor(private readonly minterService: MinterService) {}

	@Get()
	@ApiQuery({ name: 'status', enum: MinterStatus, required: false })
	@ApiOkResponse({ type: [MinterStateDto] })
	async getMinters(@Query('status') status?: MinterStatus): Promise<MinterStateDto[]> {
		const allMinters = await this.minterService.getAllMinters();
		return status ? allMinters.filter((m) => m.status === status) : allMinters;
	}

	@Get('bridges')
	@ApiQuery({ name: 'all', type: 'boolean', required: false })
	@ApiOkResponse({ type: [BridgeStateDto] })
	async getBridges(@Query('all') all?: string): Promise<BridgeStateDto[]> {
		if (all === 'true') return this.minterService.getAllBridges();
		return this.minterService.getActiveBridges();
	}
}

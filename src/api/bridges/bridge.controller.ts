import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BridgeService } from './bridge.service';
import { BridgeStateDto } from '../../common/dto/stablecoinBridge.dto';

@ApiTags('Bridges')
@Controller('bridges')
export class BridgeController {
	constructor(private readonly bridgeService: BridgeService) {}

	@Get()
	@ApiOperation({ summary: 'Get stablecoin bridges' })
	@ApiQuery({ name: 'active', type: 'boolean', required: false })
	@ApiOkResponse({ type: [BridgeStateDto], description: 'List of stablecoin bridges' })
	async getBridges(@Query('active') active?: string): Promise<BridgeStateDto[]> {
		// Is it possible to use a single function to handle all cases?
		if (active === 'true') return this.bridgeService.getActiveBridges();
		return this.bridgeService.getAllBridges();
	}
}

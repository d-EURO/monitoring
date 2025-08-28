import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { CollateralService } from './collateral.service';
import { CollateralStateDto } from '../../common/dto';

@ApiTags('Collateral')
@Controller('collateral')
export class CollateralController {
	constructor(private readonly collateralService: CollateralService) {}

	@Get()
	@ApiOkResponse({ type: [CollateralStateDto] })
	async getCollateral(): Promise<CollateralStateDto[]> {
		return this.collateralService.getCollateralStates();
	}
}
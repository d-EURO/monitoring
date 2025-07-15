import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { DeuroService } from './deuro.service';
import { DeuroStateDto } from 'src/common/dto';

@ApiTags('dEURO')
@Controller('deuro')
export class DeuroController {
	constructor(private readonly deuroService: DeuroService) {}

	@Get()
	@ApiOkResponse({ type: DeuroStateDto })
	async getCurrentState(): Promise<DeuroStateDto | null> {
		return this.deuroService.getCurrentState();
	}
}

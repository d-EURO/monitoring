import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ChallengeService } from './challenge.service';
import { ChallengeStateDto } from '../../common/dto';

@ApiTags('Challenges')
@Controller('challenges')
export class ChallengeController {
	constructor(private readonly challengeService: ChallengeService) {}

	@Get()
	@ApiQuery({ name: 'open', type: 'boolean', required: false })
	@ApiOkResponse({ type: [ChallengeStateDto] })
	async getChallenges(@Query('open') open?: string): Promise<ChallengeStateDto[]> {
		return this.challengeService.getChallenges(open);
	}
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ChallengeRepository } from '../../database/repositories';
import { ChallengeStateDto } from '../../common/dto';

@ApiTags('Challenges')
@Controller('challenges')
export class ChallengeController {
	constructor(private readonly challengeRepository: ChallengeRepository) {}

	@Get()
	@ApiQuery({ name: 'open', type: 'boolean', required: false })
	@ApiOkResponse({ type: [ChallengeStateDto] })
	async getChallenges(@Query('open') open?: string): Promise<ChallengeStateDto[]> {
		if (open === 'true') return this.challengeRepository.getOpenChallenges();
		return this.challengeRepository.getAllChallenges();
	}
}

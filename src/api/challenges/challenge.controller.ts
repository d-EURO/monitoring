import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ChallengeRepository } from '../../database/repositories';
import { ChallengeStateDto } from '../../common/dto';

@ApiTags('Challenges')
@Controller('challenges')
export class ChallengeController {
	constructor(private readonly challengeRepository: ChallengeRepository) {}

	@Get()
	@ApiOperation({ summary: 'Get challenges' })
	@ApiQuery({ name: 'open', type: 'boolean', required: false })
	@ApiOkResponse({ type: [ChallengeStateDto], description: 'List of challenges' })
	async getChallenges(@Query('open') open?: string): Promise<ChallengeStateDto[]> {
		// Is it possible to use a single function to handle all cases?
		if (open === 'true') return this.challengeRepository.getOpenChallenges();
		return this.challengeRepository.getAllChallenges();
	}
}

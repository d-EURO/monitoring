import { Injectable } from '@nestjs/common';
import { ChallengeRepository } from '../../database/repositories';
import { ChallengeState, ChallengeStateDto } from '../../common/dto';

@Injectable()
export class ChallengeService {
	constructor(private readonly challengeRepository: ChallengeRepository) {}

	async getChallenges(open?: string): Promise<ChallengeStateDto[]> {
		let challenges: ChallengeState[];
		
		if (open === 'true') {
			challenges = await this.challengeRepository.getOpenChallenges();
		} else {
			challenges = await this.challengeRepository.getAllChallenges();
		}
		
		// Sort by start - descending
		challenges.sort((a, b) => Number(b.start) - Number(a.start));
		
		return challenges.map(this.mapToDto);
	}

	private mapToDto(challenge: ChallengeState): ChallengeStateDto {
		return {
			id: challenge.id,
			challenger: challenge.challenger,
			position: challenge.position,
			positionOwner: challenge.positionOwner,
			start: challenge.start,
			initialSize: challenge.initialSize.toString(),
			size: challenge.size,
			collateralAddress: challenge.collateralAddress,
			liqPrice: challenge.liqPrice,
			phase: challenge.phase,
			status: challenge.status,
			currentPrice: challenge.currentPrice,
		};
	}
}
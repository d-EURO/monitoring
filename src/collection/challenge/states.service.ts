import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ChallengeState, ChallengeStatus } from '../../common/dto';
import { ChallengeRepository } from '../../database/repositories';

@Injectable()
export class ChallengeStatesService {
	private readonly logger = new Logger(ChallengeStatesService.name);

	constructor(private readonly challengeRepository: ChallengeRepository) {}

	async getChallengesState(mintingHub: ethers.Contract): Promise<ChallengeState[]> {
		this.logger.log('Fetching challenges state...');
		try {
			const nextChallengeId = await mintingHub.nextChallengeNumber();
			const challengePromises: Promise<ChallengeState | null>[] = [];

			// Fetch all challenges (starting from ID 1)
			for (let i = 1n; i < nextChallengeId; i++) {
				challengePromises.push(this.getChallengeDetails(mintingHub, i));
			}

			const challengeResults = await Promise.all(challengePromises);
			return challengeResults.filter((challenge): challenge is ChallengeState => challenge !== null);
		} catch (error) {
			this.logger.error('Failed to fetch challenges state:', error);
			return [];
		}
	}

	private async getChallengeDetails(mintingHub: ethers.Contract, challengeId: bigint): Promise<ChallengeState | null> {
		try {
			const challengeData = await mintingHub.challenges(challengeId);

			// Skip if challenge doesn't exist (challenger is zero address)
			if (challengeData.challenger === ethers.ZeroAddress) {
				return null;
			}

			const currentPrice = await mintingHub.currentAuctionPrice(challengeId);

			// Determine challenge status
			let status = ChallengeStatus.OPENED;
			if (challengeData.size === 0n) {
				status = challengeData.initialSize > 0n ? ChallengeStatus.SUCCEEDED : ChallengeStatus.AVERTED;
			} else if (challengeData.size < challengeData.initialSize) {
				status = challengeData.phase > 0 ? ChallengeStatus.AUCTION : ChallengeStatus.PARTIALLY_AVERTED;
			} else if (challengeData.phase > 0) {
				status = ChallengeStatus.AUCTION;
			}

			return {
				id: Number(challengeId),
				challenger: challengeData.challenger,
				position: challengeData.position,
				positionOwner: challengeData.positionOwner,
				start: Number(challengeData.start),
				initialSize: challengeData.initialSize,
				size: challengeData.size.toString(),
				collateralAddress: challengeData.collateral,
				liqPrice: challengeData.liqPrice.toString(),
				phase: Number(challengeData.phase),
				status,
				currentPrice: currentPrice.toString(),
			};
		} catch (error) {
			this.logger.warn(`Failed to fetch challenge ${challengeId}:`, error);
			return null;
		}
	}

	async persistChallengesState(client: any, challenges: ChallengeState[], blockNumber: number): Promise<void> {
		await this.challengeRepository.saveChallenges(client, challenges, blockNumber);
	}
}

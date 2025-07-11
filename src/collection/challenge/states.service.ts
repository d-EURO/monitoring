import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ChallengeState, ChallengeStatus } from '../../common/dto';
import { ChallengeRepository, PositionRepository } from '../../database/repositories';
import { MulticallService } from '../../common/services';

@Injectable()
export class ChallengeStatesService {
	private readonly logger = new Logger(ChallengeStatesService.name);

	constructor(
		private readonly challengeRepository: ChallengeRepository,
		private readonly positionRepository: PositionRepository, // Assuming PositionRepository is defined elsewhere
		private readonly multicallService: MulticallService
	) {}

	async getChallengesState(mintingHub: ethers.Contract): Promise<ChallengeState[]> {
		try {
			this.logger.log('Fetching challenges state...');

			const activeChallenges = await this.challengeRepository.getActiveChallengeStartedEvents();
			if (activeChallenges.length === 0) return [];

			// Get position data
			const allPositions = await this.positionRepository.getAllPositions();
			const addressToPosition = new Map(allPositions.map((p) => [p.address, p]));

			// Get current prices for all challenges using multicall
			const priceCalls = activeChallenges.map((s) => ({
				contract: mintingHub,
				method: 'price',
				args: [s.number],
			}));

			const currentPrices = await this.multicallService.executeBatch(mintingHub.runner as ethers.Provider, priceCalls);

			const currentTimestamp = Math.floor(Date.now() / 1000);

			// Process all challenges in parallel
			const challengePromises = activeChallenges.map(async (event, index) => {
				const initialSize = BigInt(event.size);
				const avertedAmount = BigInt((await this.challengeRepository.getAvertedAmountByChallengeId(Number(event.number))) || '0');
				const acquiredCollateral = BigInt(
					(await this.challengeRepository.getAcquiredCollateralByChallengeId(Number(event.number))) || '0'
				);
				const remainingAmount = initialSize - avertedAmount - acquiredCollateral;
				const position = addressToPosition.get(event.position);
				const challengePeriod = Number(position?.challengePeriod);

				const challengeStartTime = Number(event.timestamp);
				const auctionStart = challengeStartTime + challengePeriod;
				let status = ChallengeStatus.OPENED;

				if (remainingAmount === 0n) {
					status = acquiredCollateral > 0n ? ChallengeStatus.SUCCEEDED : ChallengeStatus.AVERTED;
				} else if (currentTimestamp < auctionStart) {
					status = avertedAmount > 0n ? ChallengeStatus.PARTIALLY_AVERTED : ChallengeStatus.OPENED;
				} else {
					status = ChallengeStatus.AUCTION;
				}

				return {
					id: Number(event.number),
					challenger: event.challenger,
					position: event.position,
					positionOwner: position?.owner || '',
					start: challengeStartTime,
					initialSize: initialSize,
					size: remainingAmount.toString(),
					collateralAddress: position?.collateralAddress || '',
					liqPrice: position?.virtualPrice || '0',
					phase: challengePeriod,
					status,
					currentPrice: currentPrices[index]?.toString() || '0',
				};
			});

			const challenges = await Promise.all(challengePromises);
			this.logger.log(`Successfully fetched ${challenges.length} challenges`);
			return challenges;
		} catch (error) {
			this.logger.error('Failed to fetch challenges state:', error);
			return [];
		}
	}

	async persistChallengesState(client: any, challenges: ChallengeState[], blockNumber: number): Promise<void> {
		await this.challengeRepository.saveChallenges(client, challenges, blockNumber);
	}
}

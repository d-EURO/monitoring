import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ChallengeState, ChallengeStatus, PositionState } from '../../common/dto';
import { ChallengeRepository, PositionRepository } from '../../database/repositories';
import { MulticallService } from '../../common/services';

@Injectable()
export class ChallengeStatesService {
	private readonly logger = new Logger(ChallengeStatesService.name);

	constructor(
		private readonly challengeRepository: ChallengeRepository,
		private readonly positionRepository: PositionRepository,
		private readonly multicallService: MulticallService
	) {}

	async getChallengesState(mintingHub: ethers.Contract, positionStates?: PositionState[]): Promise<ChallengeState[]> {
		try {
			this.logger.log('Fetching challenges state...');

			// Get challenge started events
			const activeChallenges = await this.challengeRepository.getActiveChallengeStartedEvents();
			if (activeChallenges.length === 0) return [];

			// Get positions
			const positions = positionStates || await this.positionRepository.getAllPositions();
			const addressToPosition = new Map<string, PositionState>(positions.map((p) => [p.address.toLowerCase(), p]));

			// Get current prices for all challenges using multicall
			const provider = mintingHub.runner as ethers.Provider;
			const multicallMintingHub = this.multicallService.connect(mintingHub, provider);
			const priceCalls = activeChallenges.map((s) => multicallMintingHub.price(s.number));
			const currentPrices = await this.multicallService.executeBatch(priceCalls);
			
			// Process all challenges in parallel
			const currentTimestamp = Math.floor(Date.now() / 1000);
			const challengePromises = activeChallenges.map(async (event, index) => {
				const [ avertedAmountFromDb, acquiredCollateralFromDb ] = await Promise.all([
					this.challengeRepository.getAvertedAmountByChallengeId(Number(event.number)),
					this.challengeRepository.getAcquiredCollateralByChallengeId(Number(event.number))
				]);

				const initialSize = BigInt(event.size);
				const avertedAmount = BigInt(avertedAmountFromDb || '0');
				const acquiredCollateral = BigInt(acquiredCollateralFromDb || '0');
				const remainingAmount = initialSize - avertedAmount - acquiredCollateral;
				const position = addressToPosition.get(event.position.toLowerCase());
				const challengePeriod = position ? Number(position.challengePeriod) : 0;
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
					liqPrice: position?.virtualPrice ? position.virtualPrice.toString() : '0',
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
		this.logger.log(`Persisting ${challenges.length} challenge states...`);
		try {
			await this.challengeRepository.saveChallenges(client, challenges, blockNumber);
			this.logger.log('Challenge states persisted successfully');
		} catch (error) {
			this.logger.error('Failed to persist challenge states:', error);
			throw error;
		}
	}
}

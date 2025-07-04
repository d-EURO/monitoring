import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { PositionState, PositionStatus, CollateralState, MintingHubPositionOpenedEvent } from '../../common/dto';
import { PositionV2ABI } from '@deuro/eurocoin';
import { PositionRepository, CollateralRepository } from '../../database/repositories';

@Injectable()
export class PositionStatesService {
	private readonly logger = new Logger(PositionStatesService.name);

	constructor(
		private readonly positionRepository: PositionRepository,
		private readonly collateralRepository: CollateralRepository
	) {}

	async getPositionsState(activePositionAddresses: string[], provider: ethers.Provider): Promise<PositionState[]> {
		this.logger.log('Fetching positions state...');
		const positions: PositionState[] = [];

		for (const positionAddress of activePositionAddresses) {
			try {
				const positionContract = new ethers.Contract(positionAddress, PositionV2ABI, provider);
				const position = await this.getPositionState(positionContract);
				positions.push(position);
			} catch (error) {
				this.logger.error(`Failed to fetch state for position ${positionAddress}:`, error);
			}
		}

		return positions;
	}

	async getCollateralState(positionEvents: MintingHubPositionOpenedEvent[], provider: ethers.Provider): Promise<CollateralState[]> {
		this.logger.log('Calculating collateral state...');
		const collateralMap = new Map<string, CollateralState>();

		// Get all unique collateral addresses from position events
		const uniqueCollaterals = [...new Set(positionEvents.map((event) => event.collateral))];

		for (const collateralAddress of uniqueCollaterals) {
			const collateralContract = new ethers.Contract(
				collateralAddress,
				['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
				provider
			);

			try {
				const [symbol, decimals] = await Promise.all([collateralContract.symbol(), collateralContract.decimals()]);

				// Count positions using this collateral
				const positionCount = positionEvents.filter((event) => event.collateral === collateralAddress).length;

				// Get total collateral from active positions
				const totalCollateral = await this.getTotalCollateralForToken(collateralAddress);

				collateralMap.set(collateralAddress, {
					tokenAddress: collateralAddress,
					symbol,
					decimals: Number(decimals),
					totalCollateral,
					positionCount,
				});
			} catch (error) {
				this.logger.warn(`Failed to fetch collateral info for ${collateralAddress}:`, error);
			}
		}

		return Array.from(collateralMap.values());
	}

	private async getPositionState(positionContract: ethers.Contract): Promise<PositionState> {
		const [
			positionAddress,
			owner,
			start,
			expiration,
			price,
			collateral,
			principal,
			interest,
			original,
			challengePeriod,
			riskPremiumPPM,
			reserveContribution,
			fixedAnnualRatePPM,
			lastAccrual,
			cooldownEnd,
			availableForMinting,
			availableForClones,
			challengeData,
			status,
			recentCollateral,
			expiredPurchasePrice,
			minimumRequiredCollateral,
		] = await Promise.all([
			positionContract.getAddress(),
			positionContract.owner(),
			positionContract.start(),
			positionContract.expiration(),
			positionContract.price(),
			positionContract.collateral(),
			positionContract.principal(),
			positionContract.interest(),
			positionContract.original(),
			positionContract.challengePeriod(),
			positionContract.riskPremiumPPM(),
			positionContract.reserveContribution(),
			positionContract.fixedAnnualRatePPM(),
			positionContract.lastAccrual(),
			positionContract.cooldownEnd(),
			positionContract.availableForMinting(),
			positionContract.availableForClones(),
			positionContract.virtualUnpaidInterest(),
			positionContract.challengeData(),
			positionContract.status(),
			positionContract.recentCollateral(),
			positionContract.expiredPurchasePrice(),
			positionContract.minimumRequiredCollateral(),
		]);

		const collateralContract = new ethers.Contract(
			collateral,
			['function balanceOf(address) view returns (uint256)'],
			positionContract.runner
		);
		const collateralBalance = await collateralContract.balanceOf(positionAddress);

		const debt = principal + interest;
		const minimumChallenge = debt / 20n; // 5% of debt
		const virtualPrice = (recentCollateral * 10n ** 36n) / debt;

		// Determine position status
		let positionStatus = PositionStatus.ACTIVE;
		const now = BigInt(Math.floor(Date.now() / 1000));
		if (status === 2n) {
			positionStatus = PositionStatus.CLOSED;
		} else if (now > expiration) {
			positionStatus = PositionStatus.EXPIRED;
		} else if (now > expiration - 30n * 24n * 60n * 60n) {
			positionStatus = PositionStatus.EXPIRING;
		} else if (challengeData.challenger !== ethers.ZeroAddress) {
			positionStatus = PositionStatus.CHALLENGED;
		} else if (now < cooldownEnd) {
			positionStatus = PositionStatus.COOLDOWN;
		} else if (collateralBalance < minimumRequiredCollateral) {
			positionStatus = PositionStatus.UNDERCOLLATERALIZED;
		}

		return {
			address: positionAddress,
			status: positionStatus,
			owner,
			original,
			collateralAddress: collateral,
			collateralBalance,
			price,
			virtualPrice,
			expiredPurchasePrice,
			collateralRequirement: minimumRequiredCollateral,
			debt,
			interest,
			minimumCollateral: minimumRequiredCollateral,
			minimumChallengeAmount: minimumChallenge,
			limit: principal,
			principal,
			riskPremiumPPM: Number(riskPremiumPPM),
			reserveContribution: Number(reserveContribution),
			fixedAnnualRatePPM: Number(fixedAnnualRatePPM),
			lastAccrual,
			start,
			cooldown: cooldownEnd,
			expiration,
			challengedAmount: challengeData.size,
			challengePeriod,
			isClosed: status === 2n,
			availableForMinting,
			availableForClones,
			created: Number(start),
		};
	}

	private async getTotalCollateralForToken(tokenAddress: string): Promise<bigint> {
		const positions = await this.positionRepository.getPositionsByCollateral(tokenAddress);
		return positions.reduce((sum, pos) => sum + BigInt(pos.collateralBalance), 0n);
	}

	async persistPositionsState(positions: PositionState[], blockNumber: number): Promise<void> {
		await this.positionRepository.savePositionStates(positions, blockNumber);
	}

	async persistCollateralState(collaterals: CollateralState[], blockNumber: number): Promise<void> {
		await this.collateralRepository.saveCollateralStates(collaterals, blockNumber);
	}
}

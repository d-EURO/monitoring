import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { PositionState, PositionStatus } from '../../common/dto';
import { ERC20ABI, PositionV2ABI } from '@deuro/eurocoin';
import { PositionRepository } from '../../database/repositories';
import { MulticallService } from '../../common/services';
import { BlockchainService } from 'src/blockchain/blockchain.service';

@Injectable()
export class PositionStatesService {
	private readonly logger = new Logger(PositionStatesService.name);

	constructor(
		private readonly positionRepository: PositionRepository,
		private readonly blockchainService: BlockchainService,
		private readonly multicallService: MulticallService
	) {}

	async getPositionsState(provider: ethers.Provider): Promise<PositionState[]> {
		const positionAddresses = await this.positionRepository.getActivePositionAddresses();
		this.logger.log(`Fetching state for ${positionAddresses.length} positions using multicall...`);

		// Split addresses into batches
		const BATCH_SIZE = 50;
		const batchedPositions: string[][] = [];
		for (let i = 0; i < positionAddresses.length; i += BATCH_SIZE) batchedPositions.push(positionAddresses.slice(i, i + BATCH_SIZE));

		// Process each batch with multicall
		let positions: PositionState[] = [];
		for (let batchIndex = 0; batchIndex < batchedPositions.length; batchIndex++) {
			const positionsBatch = batchedPositions[batchIndex];
			this.logger.debug(`Processing batch ${batchIndex + 1}/${batchedPositions.length} (${positionsBatch.length} positions)`);

			try {
				positions = await this.getPositionData(positionsBatch, provider);
			} catch (error) {
				this.logger.error(`Failed to fetch batch ${batchIndex + 1}:`, error);
			}
		}

		this.logger.log(`Successfully fetched ${positions.length} position states`);
		return positions;
	}

	async getPositionData(positions: string[], provider: ethers.Provider): Promise<PositionState[]> {
		const positionContracts = positions.map((address) => new ethers.Contract(address, PositionV2ABI, provider));
		const collateralAddresses = await this.multicallService.executeBatch<string[]>(
			positionContracts.map((contract) => this.multicallService.connect(contract, provider).collateral())
		);

		// Get prices from collateral objects
		// const collateralSet = new Set(collateralAddresses);
		// const collateralPrices = await this.priceService.getTokenPricesInEur(Array.from(collateralSet));

		try {
			const results = await Promise.all(
				positionContracts.map(async (positionContract, index) => {
					const mintingHubContract = this.blockchainService.getContracts().mintingHubContract;
					const collateralContract = new ethers.Contract(collateralAddresses[index], ERC20ABI, provider);

					// Connect to multicall provider
					const multicallPosition = this.multicallService.connect(positionContract, provider);
					const multicallCollateral = this.multicallService.connect(collateralContract, provider);
					const multicallMintingHub = this.multicallService.connect(mintingHubContract, provider);

					const [
						address,
						owner,
						start,
						expiration,
						price,
						virtualPrice,
						collateralAddress,
						principal,
						interest,
						debt,
						original,
						limit,
						challengePeriod,
						riskPremiumPPM,
						reserveContribution,
						fixedAnnualRatePPM,
						lastAccrual,
						cooldown,
						availableForMinting,
						availableForClones,
						challengeData,
						isClosed,
						collateralRequirement,
						minimumCollateral,
						challengedAmount,
						collateralBalance,
						expiredPurchasePrice,
					] = await this.multicallService.executeBatch([
						multicallPosition.getAddress(),
						multicallPosition.owner(),
						multicallPosition.start(),
						multicallPosition.expiration(),
						multicallPosition.price(),
						multicallPosition.virtualPrice(),
						multicallPosition.collateral(),
						multicallPosition.principal(),
						multicallPosition.getInterest(),
						multicallPosition.getDebt(),
						multicallPosition.original(),
						multicallPosition.limit(),
						multicallPosition.challengePeriod(),
						multicallPosition.riskPremiumPPM(),
						multicallPosition.reserveContribution(),
						multicallPosition.fixedAnnualRatePPM(),
						multicallPosition.lastAccrual(),
						multicallPosition.cooldown(),
						multicallPosition.availableForMinting(),
						multicallPosition.availableForClones(),
						multicallPosition.challengeData(),
						multicallPosition.isClosed(),
						multicallPosition.getCollateralRequirement(),
						multicallPosition.minimumCollateral(),
						multicallPosition.challengedAmount(),
						multicallCollateral.balanceOf(positionContract.getAddress()),
						multicallMintingHub.expiredPurchasePrice(positionContract.getAddress()),
					]);

					// Determine position status
					let status = PositionStatus.ACTIVE;
					const now = BigInt(Math.floor(Date.now() / 1000));
					if (isClosed) {
						status = PositionStatus.CLOSED;
					} else if (now > expiration) {
						status = PositionStatus.EXPIRED;
					} else if (now > expiration - 30n * 24n * 60n * 60n) {
						status = PositionStatus.EXPIRING;
					} else if (challengeData.challenger !== ethers.ZeroAddress) {
						status = PositionStatus.CHALLENGED;
					} else if (now < cooldown) {
						status = PositionStatus.COOLDOWN;
					} else if (collateralBalance < collateralRequirement) {
						status = PositionStatus.UNDERCOLLATERALIZED;
					}

					// Get PositionOpened event for the position created timestamp
					const created = await this.positionRepository.getPositionOpenedTimestamp(address);
					const minimumChallengeAmount = minimumCollateral < collateralBalance ? minimumCollateral : collateralBalance;

					return {
						address,
						status,
						owner,
						original,
						collateralAddress,
						collateralBalance,
						price,
						virtualPrice,
						expiredPurchasePrice,
						collateralRequirement,
						debt,
						interest,
						minimumCollateral,
						minimumChallengeAmount,
						limit,
						principal,
						riskPremiumPPM: Number(riskPremiumPPM),
						reserveContribution: Number(reserveContribution),
						fixedAnnualRatePPM: Number(fixedAnnualRatePPM),
						lastAccrual,
						start,
						cooldown,
						expiration,
						challengedAmount,
						challengePeriod,
						isClosed,
						availableForMinting,
						availableForClones,
						created,
					};
				})
			);

			this.logger.log(`Fetched data for ${positions.length} positions using multicall`);
			return results;
		} catch (error) {
			this.logger.error('Failed to fetch position data with multicall:', error);
			throw error;
		}
	}

	async persistPositionsState(client: any, positions: PositionState[], blockNumber: number): Promise<void> {
		this.logger.log(`Persisting ${positions.length} position states...`);
		try {
			await this.positionRepository.savePositionStates(client, positions, blockNumber);
			this.logger.log('Position states persisted successfully');
		} catch (error) {
			this.logger.error('Failed to persist position states:', error);
			throw error;
		}
	}
}

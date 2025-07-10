import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { MulticallWrapper, MulticallProvider } from 'ethers-multicall-provider';

@Injectable()
export class MulticallService {
	private readonly logger = new Logger(MulticallService.name);
	private multicallProvider: MulticallProvider | null = null;

	/**
	 * Get or create a multicall provider wrapper
	 */
	getMulticallProvider(provider: ethers.Provider): MulticallProvider {
		// Create a new multicall provider if needed
		if (!this.multicallProvider || !MulticallWrapper.isMulticallProvider(this.multicallProvider)) {
			this.multicallProvider = MulticallWrapper.wrap(provider as ethers.AbstractProvider);
		}
		return this.multicallProvider;
	}

	/**
	 * Execute multiple contract calls in a single RPC request
	 * @param calls Array of contract call configurations
	 * @returns Array of results in the same order as calls
	 */
	async executeBatch(
		provider: ethers.Provider,
		calls: Array<{
			contract: ethers.Contract;
			method: string;
			args?: any[];
		}>
	): Promise<any[]> {
		const multicallProvider = this.getMulticallProvider(provider);
		
		try {
			// Create multicall-wrapped contracts
			const promises = calls.map(({ contract, method, args = [] }) => {
				const multicallContract = contract.connect(multicallProvider) as ethers.Contract;
				return multicallContract[method](...args);
			});

			// Execute all calls in a single RPC request
			const results = await Promise.all(promises);
			
			this.logger.debug(`Executed ${calls.length} calls in a single multicall`);
			return results;
		} catch (error) {
			this.logger.error('Multicall batch execution failed:', error);
			throw error;
		}
	}

	/**
	 * Execute position data fetching with multicall
	 * Specifically optimized for position contract calls
	 */
	async getPositionData(
		provider: ethers.Provider,
		positionContracts: ethers.Contract[],
		collateralAddresses: string[]
	): Promise<Array<{
		positionData: any[];
		collateralBalance: bigint;
	}>> {
		const multicallProvider = this.getMulticallProvider(provider);
		
		try {
			const results = await Promise.all(
				positionContracts.map(async (positionContract, index) => {
					// Connect position contract to multicall provider
					const multicallPosition = positionContract.connect(multicallProvider) as ethers.Contract;
					
					// Create collateral contract for balance check
					const collateralContract = new ethers.Contract(
						collateralAddresses[index],
						['function balanceOf(address) view returns (uint256)'],
						multicallProvider
					);

					// Execute all calls for this position in parallel
					// This will be batched by the multicall provider
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
						virtualUnpaidInterest,
						challengeData,
						status,
						recentCollateral,
						expiredPurchasePrice,
						minimumRequiredCollateral,
						collateralBalance
					] = await Promise.all([
						multicallPosition.getAddress(),
						multicallPosition.owner(),
						multicallPosition.start(),
						multicallPosition.expiration(),
						multicallPosition.price(),
						multicallPosition.collateral(),
						multicallPosition.principal(),
						multicallPosition.interest(),
						multicallPosition.original(),
						multicallPosition.challengePeriod(),
						multicallPosition.riskPremiumPPM(),
						multicallPosition.reserveContribution(),
						multicallPosition.fixedAnnualRatePPM(),
						multicallPosition.lastAccrual(),
						multicallPosition.cooldownEnd(),
						multicallPosition.availableForMinting(),
						multicallPosition.availableForClones(),
						multicallPosition.virtualUnpaidInterest(),
						multicallPosition.challengeData(),
						multicallPosition.status(),
						multicallPosition.recentCollateral(),
						multicallPosition.expiredPurchasePrice(),
						multicallPosition.minimumRequiredCollateral(),
						collateralContract.balanceOf(await positionContract.getAddress())
					]);

					return {
						positionData: [
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
							virtualUnpaidInterest,
							challengeData,
							status,
							recentCollateral,
							expiredPurchasePrice,
							minimumRequiredCollateral
						],
						collateralBalance
					};
				})
			);

			this.logger.log(`Fetched data for ${positionContracts.length} positions using multicall`);
			return results;
		} catch (error) {
			this.logger.error('Failed to fetch position data with multicall:', error);
			throw error;
		}
	}
}
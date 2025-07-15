import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { CollateralState, MintingHubPositionOpenedEvent, PositionState } from '../../common/dto';
import { PositionRepository, CollateralRepository } from '../../database/repositories';
import { MulticallService, PriceService } from '../../common/services';
import { ERC20ABI } from '@deuro/eurocoin';

@Injectable()
export class CollateralStatesService {
	private readonly logger = new Logger(CollateralStatesService.name);

	constructor(
		private readonly positionRepository: PositionRepository,
		private readonly collateralRepository: CollateralRepository,
		private readonly multicallService: MulticallService,
		private readonly priceService: PriceService
	) {}

	async getCollateralState(
		positionEvents: MintingHubPositionOpenedEvent[], 
		provider: ethers.Provider,
		positionStates?: PositionState[]
	): Promise<CollateralState[]> {
		this.logger.log('Calculating collateral state...');
		if (positionEvents.length === 0) return [];

		const collaterals = await this.collateralRepository.getAllCollateralStates();
		const collateralSet = [...new Set(positionEvents.map((event) => event.collateral))];
		const newCollateralAddresses = collateralSet.filter((u) => !collaterals.some((c) => c.tokenAddress === u));

		if (newCollateralAddresses.length > 0) {
			this.logger.debug(`Fetching metadata for ${newCollateralAddresses.length} new collateral tokens using multicall...`);
			const metadataCalls: Promise<any>[] = [];
			newCollateralAddresses.forEach((address) => {
				const contract = new ethers.Contract(address, ERC20ABI, provider);
				const multicallContract = this.multicallService.connect(contract, provider);
				metadataCalls.push(multicallContract.symbol(), multicallContract.decimals());
			});

			try {
				const results = await this.multicallService.executeBatch(metadataCalls);
				for (let i = 0; i < newCollateralAddresses.length; i++) {
					collaterals.push({
						tokenAddress: newCollateralAddresses[i],
						symbol: results[i * 2],
						decimals: Number(results[i * 2 + 1]),
						totalCollateral: '0',
						positionCount: 0,
						price: '0',
					});
				}
			} catch (error) {
				this.logger.error('Failed to fetch collateral metadata with multicall:', error);
			}
		}

		// Get collateral prices
		const collateralPrices = await this.priceService.getTokenPricesInEur(collaterals.map((c) => c.tokenAddress));

		// Update dynamic properties
		for (const c of collaterals) {
			const { totalCollateral, positionCount } = positionStates 
				? this.calculateTotalsFromStates(c.tokenAddress, positionStates)
				: await this.getTotalCollateralForToken(c.tokenAddress);
			c.totalCollateral = totalCollateral.toString();
			c.positionCount = positionCount;
			c.price = collateralPrices[c.tokenAddress] || '0';
		}

		this.logger.log(`Calculated collateral state for ${collaterals.length} tokens`);
		return collaterals;
	}

	private async getTotalCollateralForToken(tokenAddress: string): Promise<{ totalCollateral: bigint; positionCount: number }> {
		const positions = await this.positionRepository.getPositionsByCollateral(tokenAddress);
		const totalCollateral = positions.reduce((sum, pos) => sum + BigInt(pos.collateralBalance), 0n);
		return { totalCollateral, positionCount: positions.length };
	}

	private calculateTotalsFromStates(
		tokenAddress: string, 
		positions: PositionState[]
	): { totalCollateral: bigint; positionCount: number } {
		const tokenPositions = positions.filter(
			p => p.collateralAddress.toLowerCase() === tokenAddress.toLowerCase() && !p.isClosed
		);
		const totalCollateral = tokenPositions.reduce(
			(sum, pos) => sum + BigInt(pos.collateralBalance), 
			0n
		);
		return { totalCollateral, positionCount: tokenPositions.length };
	}

	async persistCollateralState(client: any, collaterals: CollateralState[], blockNumber: number): Promise<void> {
		this.logger.log(`Persisting ${collaterals.length} collateral states...`);
		try {
			await this.collateralRepository.saveCollateralStates(client, collaterals, blockNumber);
			this.logger.log('Collateral states persisted successfully');
		} catch (error) {
			this.logger.error('Failed to persist collateral states:', error);
			throw error;
		}
	}
}

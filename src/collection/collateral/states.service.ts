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
						totalLimit: '0',
						totalAvailableForMinting: '0',
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
			const relevantPositions = positionStates
				? positionStates
				: await this.positionRepository.getPositionsByCollateral(c.tokenAddress);
			const totals = this.calculateTotalsFromStates(c.tokenAddress, relevantPositions);
			c.totalCollateral = totals.totalCollateral.toString();
			c.positionCount = totals.positionCount;
			c.totalLimit = totals.totalLimit.toString();
			c.totalAvailableForMinting = totals.totalAvailableForMinting.toString();
			c.price = collateralPrices[c.tokenAddress] || '0';
		}

		this.logger.log(`Calculated collateral state for ${collaterals.length} tokens`);
		return collaterals;
	}

	private calculateTotalsFromStates(
		collateralAddress: string,
		positions: PositionState[]
	): {
		totalCollateral: bigint;
		positionCount: number;
		totalLimit: bigint;
		totalAvailableForMinting: bigint;
	} {
		const colPositions = positions.filter((p) => p.collateralAddress.toLowerCase() === collateralAddress.toLowerCase() && !p.isClosed);
		const totalCollateral = colPositions.reduce((sum, pos) => sum + BigInt(pos.collateralBalance), 0n);

		const uniqueOriginals = new Map<string, PositionState>();
		colPositions.forEach((pos) => {
			const original = pos.original.toLowerCase();
			if (!uniqueOriginals.has(original)) uniqueOriginals.set(original, pos);
		});

		let totalLimit = 0n;
		let totalAvailableForMinting = 0n;
		uniqueOriginals.forEach((pos) => {
			totalLimit += BigInt(pos.limit);
			totalAvailableForMinting += BigInt(pos.availableForMinting);
		});

		return {
			totalCollateral,
			positionCount: colPositions.length,
			totalLimit,
			totalAvailableForMinting,
		};
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

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { PositionState, PositionStatus, CollateralState, MintingHubPositionOpenedEvent } from '../../common/dto';
import { PositionV2ABI } from '@deuro/eurocoin';
import { PositionRepository, CollateralRepository } from '../../database/repositories';
import { MulticallService, PriceService } from '../../common/services';

@Injectable()
export class PositionStatesService {
	private readonly logger = new Logger(PositionStatesService.name);
	private tokenMetadataCache = new Map<string, { symbol: string; decimals: number }>();

	constructor(
		private readonly positionRepository: PositionRepository,
		private readonly collateralRepository: CollateralRepository,
		private readonly multicallService: MulticallService,
		private readonly priceService: PriceService
	) {}

	async getPositionsState(activePositionAddresses: string[], provider: ethers.Provider): Promise<PositionState[]> {
		this.logger.log(`Fetching state for ${activePositionAddresses.length} positions using multicall...`);
		const positions: PositionState[] = [];
		const BATCH_SIZE = 50; // Process more positions per batch with multicall

		// Split addresses into batches
		const batches: string[][] = [];
		for (let i = 0; i < activePositionAddresses.length; i += BATCH_SIZE) {
			batches.push(activePositionAddresses.slice(i, i + BATCH_SIZE));
		}

		// Process each batch with multicall
		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];
			this.logger.debug(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} positions)`);

			try {
				// Create position contracts and get collateral addresses first
				const positionContracts: ethers.Contract[] = [];
				const collateralAddresses: string[] = [];

				// First, get collateral addresses for all positions in batch
				const collateralCalls = batch.map((address) => ({
					contract: new ethers.Contract(address, PositionV2ABI, provider),
					method: 'collateral',
					args: [],
				}));

				const collaterals = await this.multicallService.executeBatch(provider, collateralCalls);

				for (let i = 0; i < batch.length; i++) {
					positionContracts.push(collateralCalls[i].contract);
					collateralAddresses.push(collaterals[i]);
				}

				// Now fetch all position data using multicall
				const positionDataResults = await this.multicallService.getPositionData(provider, positionContracts, collateralAddresses);

				// Convert results to PositionState objects
				for (const { positionData, collateralBalance } of positionDataResults) {
					const position = this.parsePositionData(positionData, collateralBalance);
					if (position) {
						positions.push(position);
					}
				}
			} catch (error) {
				this.logger.error(`Failed to fetch batch ${batchIndex + 1}:`, error);
				// Continue with next batch instead of failing entirely
			}
		}

		// Fetch market prices and calculate collateralization ratios
		if (positions.length > 0) {
			await this.enrichPositionsWithMarketData(positions, provider);
		}

		this.logger.log(`Successfully fetched ${positions.length} position states`);
		return positions;
	}

	async getCollateralState(positionEvents: MintingHubPositionOpenedEvent[], provider: ethers.Provider): Promise<CollateralState[]> {
		this.logger.log('Calculating collateral state...');
		const collateralMap = new Map<string, CollateralState>();

		// Get all unique collateral addresses from position events
		const uniqueCollaterals = [...new Set(positionEvents.map((event) => event.collateral))];

		if (uniqueCollaterals.length === 0) {
			return [];
		}

		// Filter out collaterals we already have in cache
		const uncachedCollaterals = uniqueCollaterals.filter((addr) => !this.tokenMetadataCache.has(addr));

		if (uncachedCollaterals.length > 0) {
			this.logger.debug(`Fetching metadata for ${uncachedCollaterals.length} collateral tokens using multicall...`);

			// Prepare calls for all uncached collateral tokens
			const metadataCalls = uncachedCollaterals.flatMap((address) => {
				const contract = new ethers.Contract(
					address,
					['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
					provider
				);
				return [
					{ contract, method: 'symbol' },
					{ contract, method: 'decimals' },
				];
			});

			try {
				// Fetch all metadata in one multicall
				const results = await this.multicallService.executeBatch(provider, metadataCalls);

				// Cache the results
				for (let i = 0; i < uncachedCollaterals.length; i++) {
					const symbol = results[i * 2];
					const decimals = Number(results[i * 2 + 1]);
					this.tokenMetadataCache.set(uncachedCollaterals[i], { symbol, decimals });
				}
			} catch (error) {
				this.logger.error('Failed to fetch collateral metadata with multicall:', error);
			}
		}

		// Build collateral state for all tokens
		for (const collateralAddress of uniqueCollaterals) {
			const tokenMetadata = this.tokenMetadataCache.get(collateralAddress);

			if (!tokenMetadata) {
				this.logger.warn(`Missing metadata for collateral ${collateralAddress}`);
				continue;
			}

			// Count positions using this collateral
			const positionCount = positionEvents.filter((event) => event.collateral === collateralAddress).length;

			// Get total collateral from active positions
			const totalCollateral = await this.getTotalCollateralForToken(collateralAddress);

			collateralMap.set(collateralAddress, {
				tokenAddress: collateralAddress,
				symbol: tokenMetadata.symbol,
				decimals: tokenMetadata.decimals,
				totalCollateral,
				positionCount,
			});
		}

		return Array.from(collateralMap.values());
	}

	private parsePositionData(positionData: any[], collateralBalance: bigint): PositionState | null {
		try {
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
			] = positionData;

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
		} catch (error) {
			this.logger.error('Failed to parse position data:', error);
			return null;
		}
	}

	private async getTotalCollateralForToken(tokenAddress: string): Promise<bigint> {
		const positions = await this.positionRepository.getPositionsByCollateral(tokenAddress);
		return positions.reduce((sum, pos) => sum + BigInt(pos.collateralBalance), 0n);
	}

	private async enrichPositionsWithMarketData(positions: PositionState[], provider: ethers.Provider): Promise<void> {
		try {
			const uniqueCollaterals = [...new Set(positions.map((p) => p.collateralAddress.toLowerCase()))];
			if (uniqueCollaterals.length === 0) return;

			const apiAddresses = uniqueCollaterals.filter((addr) => {
				const metadata = this.tokenMetadataCache.get(addr);
				return !metadata || !['WFPS', 'DEPS'].includes(metadata.symbol.toUpperCase());
			});

			let marketPrices: { [key: string]: string } = {};

			if (apiAddresses.length > 0) {
				const usdToEur = await this.priceService.getUsdToEur();
				const usdPrices = await this.priceService.getTokenPrices(apiAddresses);
				marketPrices = Object.entries(usdPrices).reduce(
					(acc, [address, usdPrice]) => {
						acc[address] = String(Number(usdPrice) * usdToEur);
						return acc;
					},
					{} as { [key: string]: string }
				);
			}

			for (const collateralAddress of uniqueCollaterals) {
				const metadata = this.tokenMetadataCache.get(collateralAddress);
				if (metadata && ['WFPS', 'DEPS'].includes(metadata.symbol.toUpperCase())) {
					try {
						const collateralContract = new ethers.Contract(
							collateralAddress,
							['function underlying() view returns (address)'],
							provider
						);
						const underlying = await collateralContract.underlying();
						const equityContract = new ethers.Contract(underlying, ['function price() view returns (uint256)'], provider);
						const nativePrice = await equityContract.price();
						let formattedPrice = ethers.formatUnits(nativePrice, metadata.decimals);
						
						// For WFPS, convert CHF to EUR
						if (metadata.symbol.toUpperCase() === 'WFPS') {
							const [usdToEur, usdToChf] = await Promise.all([
								this.priceService.getUsdToEur(),
								this.priceService.getUsdToChf()
							]);
							formattedPrice = String((Number(formattedPrice) / usdToChf) * usdToEur);
						}
						
						marketPrices[collateralAddress] = formattedPrice;
					} catch (error) {
						this.logger.warn(`Failed to fetch on-chain price for ${metadata.symbol}:`, error);
					}
				}
			}

			for (const position of positions) {
				const marketPrice = marketPrices[position.collateralAddress.toLowerCase()];
				if (marketPrice) {
					const metadata = this.tokenMetadataCache.get(position.collateralAddress.toLowerCase());
					if (metadata) {
						const scaledMarketPrice = ethers.parseUnits(marketPrice, BigInt(36) - BigInt(metadata.decimals));
						position.marketPrice = scaledMarketPrice;
						if (position.virtualPrice > 0n) {
							const ratio = (scaledMarketPrice * 10000n) / position.virtualPrice;
							position.collateralizationRatio = Number(ratio) / 10000;
						}
					}
				}
			}

			this.logger.log(`Enriched ${positions.length} positions with market data`);
		} catch (error) {
			this.logger.error('Failed to enrich positions with market data:', error);
		}
	}

	async persistPositionsState(client: any, positions: PositionState[], blockNumber: number): Promise<void> {
		await this.positionRepository.savePositionStates(client, positions, blockNumber);
	}

	async persistCollateralState(client: any, collaterals: CollateralState[], blockNumber: number): Promise<void> {
		await this.collateralRepository.saveCollateralStates(client, collaterals, blockNumber);
	}
}

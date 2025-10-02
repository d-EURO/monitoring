import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { AppConfigService } from '../config/config.service';
import { ProviderService } from './provider.service';
import { ADDRESS, DecentralizedEUROABI, MintingHubV2ABI } from '@deuro/eurocoin';
import { PrismaClientService } from './prisma/client.service';

interface BlockchainCount {
	count: number;
	lastFetched: number;
}

@Injectable()
export class BlockchainVerificationService {
	private readonly logger = new Logger(BlockchainVerificationService.name);
	private readonly CACHE_DURATION = 60_000; // 1 minute

	private deuroContract: ethers.Contract;
	private mintingHubContract: ethers.Contract;

	// Caches
	private mintersCache: BlockchainCount | null = null;
	private positionsCache: BlockchainCount | null = null;

	constructor(
		private readonly config: AppConfigService,
		private readonly providerService: ProviderService,
		private readonly prisma: PrismaClientService
	) {
		const chainId = this.config.blockchainId;
		const provider = this.providerService.provider;

		this.deuroContract = new ethers.Contract(ADDRESS[chainId].decentralizedEURO, DecentralizedEUROABI, provider);
		this.mintingHubContract = new ethers.Contract(ADDRESS[chainId].mintingHubGateway, MintingHubV2ABI, provider);
	}

	async getTotalMintersFromBlockchain(): Promise<number> {
		const now = Date.now();
		if (this.mintersCache && now - this.mintersCache.lastFetched < this.CACHE_DURATION) {
			this.logger.debug(`Returning cached minter count: ${this.mintersCache.count}`);
			return this.mintersCache.count;
		}

		try {
			this.logger.log('Fetching total minters from blockchain...');

			const appliedFilter = this.deuroContract.filters.MinterApplied();
			const deploymentBlock = this.config.deploymentBlock;
			const appliedEvents = await this.deuroContract.queryFilter(appliedFilter, deploymentBlock, 'latest');

			const uniqueMinters = new Set<string>();
			for (const event of appliedEvents) {
				if ('args' in event && event.args && event.args.length > 0) {
					uniqueMinters.add(event.args[0].toLowerCase());
				}
			}

			const count = uniqueMinters.size;
			this.mintersCache = { count, lastFetched: now };

			this.logger.log(`Found ${count} unique minter applications on blockchain`);
			return count;
		} catch (error) {
			this.logger.error('Error fetching minters from blockchain:', error);
			return this.mintersCache?.count || 0;
		}
	}

	async getTotalPositionsFromBlockchain(): Promise<number> {
		const now = Date.now();
		if (this.positionsCache && now - this.positionsCache.lastFetched < this.CACHE_DURATION) {
			this.logger.debug(`Returning cached position count: ${this.positionsCache.count}`);
			return this.positionsCache.count;
		}

		try {
			this.logger.log('Fetching total positions from blockchain...');

			const positionOpenedFilter = this.mintingHubContract.filters.PositionOpened();
			const deploymentBlock = this.config.deploymentBlock;
			const positionOpenedEvents = await this.mintingHubContract.queryFilter(positionOpenedFilter, deploymentBlock, 'latest');

			const uniquePositions = new Set<string>();
			for (const event of positionOpenedEvents) {
				if ('args' in event && event.args && event.args.length > 1) {
					// args[1] is the position address
					uniquePositions.add(event.args[1].toLowerCase());
				}
			}

			const count = uniquePositions.size;
			this.positionsCache = { count, lastFetched: now };

			this.logger.log(`Found ${count} unique positions on blockchain`);
			return count;
		} catch (error) {
			this.logger.error('Error fetching positions from blockchain:', error);
			return this.positionsCache?.count || 0;
		}
	}

	async getDatabaseMinterCount(): Promise<number> {
		const count = await this.prisma.minterState.count();
		return count;
	}

	async getDatabasePositionCount(): Promise<number> {
		const count = await this.prisma.positionState.count();
		return count;
	}

	async getVerificationStatus(): Promise<{
		minters: { blockchain: number; database: number; hasDiscrepancy: boolean };
		positions: { blockchain: number; database: number; hasDiscrepancy: boolean };
	}> {
		const [blockchainMinters, dbMinters, blockchainPositions, dbPositions] = await Promise.all([
			this.getTotalMintersFromBlockchain(),
			this.getDatabaseMinterCount(),
			this.getTotalPositionsFromBlockchain(),
			this.getDatabasePositionCount(),
		]);

		return {
			minters: {
				blockchain: blockchainMinters,
				database: dbMinters,
				hasDiscrepancy: blockchainMinters !== dbMinters,
			},
			positions: {
				blockchain: blockchainPositions,
				database: dbPositions,
				hasDiscrepancy: blockchainPositions !== dbPositions,
			},
		};
	}

	async refreshCache(): Promise<void> {
		this.mintersCache = null;
		this.positionsCache = null;
		await Promise.all([this.getTotalMintersFromBlockchain(), this.getTotalPositionsFromBlockchain()]);
	}
}

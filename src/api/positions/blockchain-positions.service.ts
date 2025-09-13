import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from '../../blockchain/blockchain.service';

@Injectable()
export class BlockchainPositionsService {
	private readonly logger = new Logger(BlockchainPositionsService.name);
	private mintingHubContract: ethers.Contract;

	// Cache for 1 minute
	private cachedCount: number | null = null;
	private lastFetch: number = 0;
	private readonly CACHE_DURATION = 60 * 1000; // 1 minute

	constructor(private readonly blockchainService: BlockchainService) {
		this.mintingHubContract = this.blockchainService.getContracts().mintingHubContract;
	}

	async getTotalPositionsFromBlockchain(): Promise<number> {
		// Check cache
		const now = Date.now();
		if (this.cachedCount !== null && (now - this.lastFetch) < this.CACHE_DURATION) {
			this.logger.debug(`Returning cached position count: ${this.cachedCount}`);
			return this.cachedCount;
		}

		try {
			this.logger.log('Fetching total positions from blockchain...');

			// Fetch all PositionOpened events
			const positionOpenedFilter = this.mintingHubContract.filters.PositionOpened();
			const deploymentBlock = this.blockchainService.getDeploymentBlock();
			const positionOpenedEvents = await this.mintingHubContract.queryFilter(
				positionOpenedFilter,
				deploymentBlock,
				'latest'
			);

			// Get unique position addresses
			const uniquePositions = new Set<string>();
			for (const event of positionOpenedEvents) {
				if ('args' in event && event.args?.[1]) {
					// args[1] is the position address according to the event signature
					uniquePositions.add(event.args[1].toLowerCase());
				}
			}

			const count = uniquePositions.size;
			this.logger.log(`Found ${count} unique positions on blockchain`);

			// Update cache
			this.cachedCount = count;
			this.lastFetch = now;

			return count;
		} catch (error) {
			this.logger.error('Error fetching positions from blockchain:', error);
			// If we have cached data and encounter an error, return cached data
			if (this.cachedCount !== null) {
				this.logger.warn('Returning stale cached data due to error');
				return this.cachedCount;
			}
			throw error;
		}
	}

	// Force refresh the cache
	async refreshCache(): Promise<number> {
		this.cachedCount = null;
		this.lastFetch = 0;
		return this.getTotalPositionsFromBlockchain();
	}
}
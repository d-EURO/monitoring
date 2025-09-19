import { ethers } from 'ethers';
import { Injectable } from '@nestjs/common';
import { MulticallWrapper, MulticallProvider } from 'ethers-multicall-provider';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class ProviderService {
	private ethersProvider: ethers.Provider;
	private multicallProviderInstance: MulticallProvider;
	private blockCache = new Map<number, ethers.Block>();

	constructor(private readonly config: AppConfigService) {
		this.initializeProvider();
	}

	private initializeProvider() {
		this.ethersProvider = new ethers.JsonRpcProvider(this.config.rpcUrl);
		this.multicallProviderInstance = MulticallWrapper.wrap(this.ethersProvider as ethers.AbstractProvider);
	}

	get provider(): ethers.Provider {
		return this.ethersProvider;
	}

	get multicallProvider(): MulticallProvider {
		return this.multicallProviderInstance;
	}

	// get block with caching
	async getBlock(blockNumber: number): Promise<ethers.Block> {
		if (this.blockCache.has(blockNumber)) {
			return this.blockCache.get(blockNumber);
		}

		const block = await this.ethersProvider.getBlock(blockNumber);
		this.blockCache.set(blockNumber, block);

		// Limit cache size to last 100 blocks
		if (this.blockCache.size > 100) {
			const oldestKey = Math.min(...this.blockCache.keys());
			this.blockCache.delete(oldestKey);
		}

		return block;
	}
}

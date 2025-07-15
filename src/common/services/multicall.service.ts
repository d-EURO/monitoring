import { ethers } from 'ethers';
import { Injectable, Logger } from '@nestjs/common';
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
	 * Connect a contract to the multicall provider while preserving its type
	 */
	connect<T extends ethers.Contract>(contract: T, provider: ethers.Provider): T {
		const multicallProvider = this.getMulticallProvider(provider);
		return contract.connect(multicallProvider) as T;
	}

	/**
	 * Execute multiple contract calls in a single RPC request
	 * @param calls Array of promises from contract calls connected to multicall provider
	 * @returns Array of results in the same order as calls
	 */
	async executeBatch<T extends any[]>(calls: Promise<any>[]): Promise<T> {
		try {
			const results = await Promise.all(calls);
			this.logger.debug(`Executed ${calls.length} calls in a single multicall`);
			return results as T;
		} catch (error) {
			this.logger.error('Multicall batch execution failed:', error);
			throw error;
		}
	}
}

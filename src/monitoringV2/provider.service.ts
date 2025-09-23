import { ethers } from 'ethers';
import { Injectable, Logger } from '@nestjs/common';
import { MulticallWrapper, MulticallProvider } from 'ethers-multicall-provider';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class ProviderService {
	private readonly logger = new Logger(ProviderService.name);
	private ethersProvider: ethers.JsonRpcProvider;
	private multicallProviderInstance: MulticallProvider<ethers.JsonRpcProvider>;
	private blockCache = new Map<number, ethers.Block>();

	constructor(private readonly config: AppConfigService) {
		this.initializeProvider();
	}

	private initializeProvider() {
		this.ethersProvider = new ethers.JsonRpcProvider(this.config.rpcUrl);
		this.multicallProviderInstance = MulticallWrapper.wrap(this.ethersProvider, 480_000); // 480KB call data limit - safe for Alchemy
		this.logger.log('Multicall provider initialized with 480KB calldata limit');
	}

	get provider(): ethers.JsonRpcProvider {
		return this.ethersProvider;
	}

	get multicallProvider(): MulticallProvider<ethers.JsonRpcProvider> {
		return this.multicallProviderInstance;
	}

	async callBatch<T>(thunks: Array<() => Promise<T>>, retries = 3): Promise<T[]> {
		return this.withRetry(() => Promise.all(thunks.map((fn) => fn())), { retries });
	}

	async getBlock(blockNumber: number): Promise<ethers.Block | null> {
		if (this.blockCache.has(blockNumber)) {
			return this.blockCache.get(blockNumber);
		}

		const block = await this.ethersProvider.getBlock(blockNumber);
		if (block) this.blockCache.set(blockNumber, block);

		if (this.blockCache.size > 1000) {
			const oldestKey = Math.min(...Array.from(this.blockCache.keys()));
			this.blockCache.delete(oldestKey);
		}

		return block;
	}

	// Check if error is transient and worth retrying
	private isTransientRpcError(err: any): boolean {
		const msg = (err?.message || '').toLowerCase();
		const code = err?.code;

		return (
			// Common network / rate limit / overload cases
			msg.includes('timeout') ||
			msg.includes('timed out') ||
			msg.includes('temporarily unavailable') ||
			msg.includes('overloaded') ||
			msg.includes('socket hang up') ||
			msg.includes('connection reset') ||
			msg.includes('fetch failed') ||
			msg.includes('network error') ||
			code === 'NETWORK_ERROR' ||
			code === 'SERVER_ERROR' ||
			msg.includes('too many requests') ||
			code === 'ETIMEDOUT' ||
			code === 'ECONNRESET' ||
			code === 'EAI_AGAIN' ||
			code === 429
		);
	}

	// Generic retry with exponential backoff + jitter
	private async withRetry<T>(
		fn: () => Promise<T>,
		options: { retries?: number; baseMs?: number; factor?: number; maxMs?: number } = {}
	): Promise<T> {
		const { retries = 3, baseMs = 200, factor = 2, maxMs = 2000 } = options;
		let attempt = 0;
		let delay = baseMs;

		while (true) {
			try {
				return await fn();
			} catch (err) {
				attempt++;
				if (attempt > retries || !this.isTransientRpcError(err)) {
					this.logger.error(`RPC call failed after ${attempt} attempts: ${err.message}`);
					throw err;
				}

				const jitter = Math.random() * 0.4 + 0.8; // 0.8x–1.2x
				const waitMs = Math.min(delay, maxMs) * jitter;
				this.logger.warn(`RPC call failed (attempt ${attempt}/${retries}), retrying in ${Math.round(waitMs)}ms: ${err.message}`);

				await new Promise((resolve) => setTimeout(resolve, waitMs));
				delay *= factor;
			}
		}
	}
}

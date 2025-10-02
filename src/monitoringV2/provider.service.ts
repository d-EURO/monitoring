import { ethers } from 'ethers';
import { Injectable, Logger } from '@nestjs/common';
import { MulticallWrapper, MulticallProvider } from 'ethers-multicall-provider';
import { AppConfigService } from 'src/config/config.service';

class RpcStats {
	private stats = new Map<string, { calls: number; errors: number }>();

	record(method: string, isError: boolean): void {
		const stat = this.stats.get(method) || { calls: 0, errors: 0 };
		stat.calls++;
		if (isError) stat.errors++;
		this.stats.set(method, stat);
	}

	getStats(): Record<string, { calls: number; errors: number }> {
		return Object.fromEntries(this.stats);
	}
}

class LoggingJsonRpcProvider extends ethers.JsonRpcProvider {
	constructor(url: string, private rpcStats: RpcStats) {
		super(url);
	}

	async send(method: string, params: Array<any>): Promise<any> {
		let isError = false;
		try {
			return await super.send(method, params);
		} catch (error) {
			isError = true;
			throw error;
		} finally {
			this.rpcStats.record(method, isError);
		}
	}
}

@Injectable()
export class ProviderService {
	private static readonly SERVER_STATUSES = new Set([500, 502, 503, 504, 520, 522, 524]);
	private static readonly NET_CODES = new Set([
		'ETIMEDOUT',
		'ECONNRESET',
		'ECONNABORTED',
		'ECONNREFUSED',
		'EAI_AGAIN',
		'NETWORK_ERROR',
		'SERVER_ERROR',
		'TIMEOUT',
	]);
	private static readonly TOO_LARGE_PATTERNS = [
		'payload too large',
		'request entity too large',
		'entity too large',
		'data too large',
		'max content length',
		'request size exceeded',
		'oversized',
	];
	private static readonly DETERMINISTIC_PATTERNS = ['execution reverted', 'call exception', 'invalid argument', 'method not found'];
	private static readonly RATE_LIMIT_PATTERNS = ['too many requests', 'rate limit'];
	private static readonly NETWORK_PATTERNS = [
		'timeout',
		'timed out',
		'temporarily unavailable',
		'overloaded',
		'socket hang up',
		'connection reset',
		'connection closed',
		'connection aborted',
		'network error',
		'dns',
	];

	private readonly logger = new Logger(ProviderService.name);
	private ethersProvider: ethers.JsonRpcProvider;
	private multicallProviderInstance: MulticallProvider<ethers.JsonRpcProvider>;
	private blockCache = new Map<number, ethers.Block>();
	private rpcStats = new RpcStats();

	constructor(private readonly config: AppConfigService) {
		this.initializeProvider();
	}

	private initializeProvider() {
		this.ethersProvider = new LoggingJsonRpcProvider(this.config.rpcUrl, this.rpcStats);
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

		const block = await this.withRetry(() => this.ethersProvider.getBlock(blockNumber));
		if (block) this.blockCache.set(blockNumber, block);

		if (this.blockCache.size > 1000) {
			const oldestKey = Math.min(...Array.from(this.blockCache.keys()));
			this.blockCache.delete(oldestKey);
		}

		return block;
	}

	async getBlockNumber(): Promise<number> {
		return await this.withRetry(() => this.ethersProvider.getBlockNumber());
	}

	getRpcStats(): Record<string, { calls: number; errors: number }> {
		return this.rpcStats.getStats();
	}

	// Helper functions for retry logic

	private isTransientRpcError(err: any): boolean {
		const status = Number(err?.status ?? err?.response?.status ?? NaN);
		const code = String(err?.code ?? err?.cause?.code ?? '');
		const msg = String(err?.shortMessage ?? err?.message ?? '').toLowerCase();

		const matches = (patterns: string[]) => patterns.some((p) => msg.includes(p));

		if (status === 413 || matches(ProviderService.TOO_LARGE_PATTERNS)) return false;
		if (matches(ProviderService.DETERMINISTIC_PATTERNS)) return false;

		if (status === 429 || code === '429' || matches(ProviderService.RATE_LIMIT_PATTERNS)) return true;
		if (ProviderService.SERVER_STATUSES.has(status)) return true;

		return ProviderService.NET_CODES.has(code) || matches(ProviderService.NETWORK_PATTERNS);
	}

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

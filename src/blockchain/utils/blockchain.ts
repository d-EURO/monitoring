import { BaseContract } from 'ethers';
import { Logger } from '@nestjs/common';

export interface BlockRange {
	fromBlock: number;
	toBlock: number;
}

// Event Queue Singleton for managing event queries
class EventQueryQueue {
	private static instance: EventQueryQueue;
	private queue: Array<() => Promise<any>> = [];
	private running = false;

	private constructor() {}

	public static getInstance(): EventQueryQueue {
		if (!EventQueryQueue.instance) {
			EventQueryQueue.instance = new EventQueryQueue();
		}
		return EventQueryQueue.instance;
	}

	public async enqueue<T>(task: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			// Add task to queue
			this.queue.push(async () => {
				try {
					const result = await task();
					resolve(result);
					return result;
				} catch (error) {
					reject(error);
					throw error;
				}
			});

			// Process queue if not already running
			this.processQueue();
		});
	}

	private async processQueue(): Promise<void> {
		if (this.running || this.queue.length === 0) return;

		this.running = true;

		try {
			while (this.queue.length > 0) {
				const task = this.queue.shift()!;
				await task();
			}
		} finally {
			this.running = false;
		}
	}
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createTimeout = (ms: number) =>
	new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms));

const LOG_EVERY_N_BATCHES = 5;

async function executeWithRetry<T>(
	fn: () => Promise<T>,
	logger: Logger,
	maxRetries: number = 5,
	retryDelay: number = 2000,
	timeoutMs: number = 30000 // 30 second timeout for RPC calls
): Promise<T> {
	let lastError: any;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await Promise.race([fn(), createTimeout(timeoutMs)]);
		} catch (error: any) {
			lastError = error;

			if (attempt < maxRetries) {
				const delay = retryDelay * Math.pow(1.5, attempt); // Exponential backoff
				logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay / 1000)}s delay`);
				await sleep(delay);
			}
		}
	}

	throw lastError;
}

async function processSingleEventQuery<T extends BaseContract>(
	contract: T,
	eventFilter: any,
	startBlock: number,
	endBlock: number,
	chunkSize: number,
	concurrencyLimit: number,
	logger: Logger
): Promise<any[]> {
	let events: any[] = [];
	const totalBlocks = endBlock - startBlock + 1;
	const eventName = eventFilter.fragment?.name || 'events';
	let currentConcurrency = concurrencyLimit;

	logger.log(`Starting ${eventName} event query for ${totalBlocks} blocks (${startBlock}-${endBlock})`);

	let batchNumber = 0;
	for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += chunkSize * currentConcurrency) {
		const currentBatch: BlockRange[] = [];
		for (let i = 0; i < currentConcurrency && currentBlock + i * chunkSize <= endBlock; i++) {
			const fromBlock = currentBlock + i * chunkSize;
			const toBlock = Math.min(fromBlock + chunkSize - 1, endBlock);
			currentBatch.push({ fromBlock, toBlock });
		}

		if (batchNumber % LOG_EVERY_N_BATCHES === 0) {
			const processedBlocks = Math.min(currentBlock - startBlock, totalBlocks);
			logger.debug(`${eventName}: processed ${processedBlocks}/${totalBlocks} blocks (batch ${batchNumber + 1})`);
		}

		let batchSuccess = false;
		let retryAttempts = 0;
		const maxConcurrencyRetries = 3;

		while (!batchSuccess && retryAttempts < maxConcurrencyRetries) {
			const batchPromises = currentBatch.map(({ fromBlock, toBlock }) => {
				return executeWithRetry(
					() => contract.queryFilter(eventFilter, fromBlock, toBlock),
					logger,
					3, // Max 3 retries per query
					2000, // Start with 2s delay, then exponential backoff
					30000 // 30s timeout for RPC calls
				).catch((error) => {
					logger.warn(`Failed to query blocks ${fromBlock}-${toBlock} after retries`, error.message);
					return [];
				});
			});

			try {
				const batchResults = await Promise.all(batchPromises);
				events = [...events, ...batchResults.flat()];
				batchSuccess = true;
			} catch (error) {
				retryAttempts++;
				if (retryAttempts < maxConcurrencyRetries) {
					currentConcurrency = Math.max(1, Math.floor(currentConcurrency / 2));
					logger.warn(`Batch failed, reducing concurrency to ${currentConcurrency} and retrying`);
					await sleep(2000);
				} else {
					logger.error(`Batch failed after ${maxConcurrencyRetries} concurrency reductions, skipping`);
					batchSuccess = true; // Exit retry loop
				}
			}
		}

		batchNumber++;
	}

	logger.log(`Completed ${eventName} event query: found ${events.length} events`);

	return events;
}

/**
 * Queries events in batched, parallel fashion to handle provider block range limitations
 * Uses a queue to ensure only one event type is queried at a time
 * @param contract Contract to query events from
 * @param eventFilter Event filter to use for querying (from contract.filters)
 * @param startBlock First block to query from
 * @param endBlock Last block to query to (or 'latest')
 * @param logger Logger instance for progress reporting
 * @param chunkSize Size of block chunks to query (usually 500 for most providers)
 * @param concurrencyLimit Maximum number of parallel queries to make
 * @returns Array of events matching the filter
 */
export async function batchedEventQuery<T extends BaseContract>(
	contract: T,
	eventFilter: any,
	startBlock: number,
	endBlock: number | 'latest' = 'latest',
	logger: Logger,
	chunkSize: number = 500,
	concurrencyLimit: number = 30
): Promise<any[]> {
	const getLatestBlock = async (): Promise<number> => {
		try {
			return await executeWithRetry(
				async () => {
					const blockNum = await contract.runner?.provider?.getBlockNumber();
					if (!blockNum && blockNum !== 0) throw new Error('Could not determine latest block number');
					return blockNum;
				},
				logger,
				3, // Max 3 retries
				2000, // 2s delay between retries
				15000 // 15s timeout for block number query
			);
		} catch (error) {
			logger.error('Failed to get latest block number', error.message);
			throw error;
		}
	};

	const latestBlock = endBlock === 'latest' ? await getLatestBlock() : endBlock;

	// Queue the event query to ensure only one runs at a time
	const queue = EventQueryQueue.getInstance();
	return queue.enqueue(() =>
		processSingleEventQuery(contract, eventFilter, startBlock, latestBlock, chunkSize, concurrencyLimit, logger)
	);
}

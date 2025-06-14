import { Contract } from 'ethers';
import { batchedEventQuery } from './blockchain';
import { BaseEvent } from '../../common/dto';

// Note: DEPLOYMENT_BLOCK is now handled by the ConfigService in NestJS
// This will be passed as a parameter to functions that need it

// LRU Block Cache with size limit to prevent memory leaks
class LRUBlockCache {
	private cache = new Map<number, any>();
	private readonly maxSize: number;

	constructor(maxSize: number = 10000) {
		// Default: cache up to 10k blocks
		this.maxSize = maxSize;
	}

	get(blockNumber: number): any {
		const value = this.cache.get(blockNumber);
		if (value !== undefined) {
			// Move to end (most recently used)
			this.cache.delete(blockNumber);
			this.cache.set(blockNumber, value);
		}
		return value;
	}

	set(blockNumber: number, block: any): void {
		// Remove if already exists to update position
		if (this.cache.has(blockNumber)) {
			this.cache.delete(blockNumber);
		}
		// Remove oldest if at capacity
		else if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}

		this.cache.set(blockNumber, block);
	}

	has(blockNumber: number): boolean {
		return this.cache.has(blockNumber);
	}

	size(): number {
		return this.cache.size;
	}

	clear(): void {
		this.cache.clear();
	}
}

const blockCache = new LRUBlockCache();

/**
 * Shared utility for fetching and processing contract events over a specific block range
 * @param contract The contract instance, e.g. new ethers.Contract(address, abi, provider)
 * @param eventFilter The event filter to apply, e.g. contract.filters.Transfer()
 * @param fromBlock Starting block number (inclusive)
 * @param toBlock Ending block number (inclusive), defaults to 'latest'
 * @returns Processed events sorted by timestamp (newest first)
 */
export async function fetchEvents<T extends BaseEvent>(
	contract: Contract,
	eventFilter: any,
	fromBlock: number,
	toBlock: number | 'latest' = 'latest'
): Promise<T[]> {
	const events = await batchedEventQuery(contract, eventFilter, fromBlock, toBlock);
	if (events.length === 0) return [];

	// Fetch uncached blocks in parallel
	const uniqueBlockNumbers = [...new Set(events.map((e) => e.blockNumber))];
	const missingBlocks = uniqueBlockNumbers.filter((blockNum) => !blockCache.has(blockNum));
	if (missingBlocks.length > 0) {
		const newBlocks = await Promise.all(missingBlocks.map((blockNum) => events[0].provider.getBlock(blockNum)));
		newBlocks.forEach((block) => {
			if (block && block.number !== undefined) {
				blockCache.set(block.number, block);
			}
		});
	}

	// Map event arguments to a structured format
	const processedEvents: T[] = [];
	for (const event of events) {
		const block = blockCache.get(event.blockNumber)!;
		const eventData: Record<string, any> = {};
		if (event.fragment) {
			event.fragment.inputs.forEach((input: any, index: number) => {
				eventData[input.name] = event.args[index];
			});
		} else {
			Object.assign(eventData, event.args);
		}

		processedEvents.push({
			...eventData,
			txHash: event.transactionHash,
			timestamp: block.timestamp,
			logIndex: event.index,
		} as T);
	}

	return processedEvents.sort((a, b) => b.timestamp - a.timestamp);
}

// getDeploymentBlock is now handled by BlockchainService
// Remove this function as it's no longer needed

// Configuration validation is now handled by NestJS ConfigModule with class-validator
// These functions are no longer needed

import { Contract } from 'ethers';
import { Logger } from '@nestjs/common';
import { batchedEventQuery } from './blockchain';
import { BaseEvent } from '../../common/dto';
import { LRUCache } from './lru-cache';

const blockCache = new LRUCache();

/**
 * Shared utility for fetching and processing contract events over a specific block range
 * @param contract The contract instance, e.g. new ethers.Contract(address, abi, provider)
 * @param eventFilter The event filter to apply, e.g. contract.filters.Transfer()
 * @param fromBlock Starting block number (inclusive)
 * @param toBlock Ending block number (inclusive), defaults to 'latest'
 * @param logger Logger instance for progress reporting
 * @returns Processed events sorted by timestamp (newest first)
 */
export async function fetchEvents<T extends BaseEvent>(
	contract: Contract,
	eventFilter: any,
	fromBlock: number,
	toBlock: number | 'latest' = 'latest',
	logger: Logger
): Promise<T[]> {
	const events = await batchedEventQuery(contract, eventFilter, fromBlock, toBlock, logger);
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

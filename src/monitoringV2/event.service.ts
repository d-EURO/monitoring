import { ethers } from 'ethers';
import { Event } from './types';
import { EVENT_SIGNATURES } from './constants';
import { Injectable, Logger } from '@nestjs/common';
import { ContractService } from './contract.service';
import { EventsRepository } from './prisma/repositories/events.repository';
import { ProviderService } from 'src/blockchain/provider.service';

@Injectable()
export class EventService {
	private readonly logger = new Logger(EventService.name);
	private readonly eventTopics: string[];

	constructor(
		private readonly contractService: ContractService,
		private readonly eventsRepo: EventsRepository,
		private readonly providerService: ProviderService
	) {
		this.eventTopics = this.generateEventTopics();
	}

	async processEvents(fromBlock: number, toBlock: number): Promise<void> {
		let events = await this.collectEvents(fromBlock, toBlock);
		const hasNewContracts = await this.contractService.captureNewContracts(events); // positions, minters
		if (hasNewContracts) events = await this.collectEvents(fromBlock, toBlock);
		await this.persistEvents(events);
	}

	private async collectEvents(fromBlock: number, toBlock: number): Promise<Event[]> {
		this.logger.log(`Collecting events from blocks ${fromBlock} to ${toBlock}`);

		const contracts = await this.contractService.getContracts();
		if (contracts.length === 0) {
			this.logger.warn('No active contracts found for event collection');
			return [];
		}

		try {
			const logs = await this.providerService.provider.getLogs({
				address: contracts.map((c) => c.address),
				fromBlock,
				toBlock,
				topics: this.eventTopics.length > 0 ? [this.eventTopics] : undefined,
			});

			const events: Event[] = [];
			for (const log of logs) {
				const event = await this.parseLog(log);
				if (event?.topic in EVENT_SIGNATURES) {
					events.push(event);
				}
			}

			this.logger.log(`Collected ${events.length} events from ${logs.length} logs`);
			return events;
		} catch (error) {
			this.logger.error(`Failed to collect events: ${error.message}`);
			throw error;
		}
	}

	private async persistEvents(events: Event[]): Promise<void> {
		if (events.length > 0) {
			await this.eventsRepo.createMany(events);
			this.logger.log(`Persisted ${events.length} events`);
		}
	}

	private generateEventTopics(): string[] {
		const topics: string[] = [];

		for (const [eventName, signature] of Object.entries(EVENT_SIGNATURES)) {
			try {
				const topicHash = ethers.id(signature);
				topics.push(topicHash);
			} catch (error) {
				this.logger.warn(`Could not generate topic for event ${eventName}: ${error.message}`);
			}
		}

		this.logger.debug(`Generated ${topics.length} event topics for filtering`);
		return topics;
	}

	private async parseLog(log: ethers.Log): Promise<Event | null> {
		try {
			const abi = await this.contractService.getContractAbi(log.address);
			if (!abi) {
				this.logger.warn(`No ABI found for contract address ${log.address}`);
				return null;
			}

			const iface = new ethers.Interface(abi);
			const parsed = iface.parseLog({
				topics: [...log.topics],
				data: log.data,
			});

			if (!parsed) {
				return null;
			}

			const block = await this.providerService.getBlock(log.blockNumber);

			return {
				txHash: log.transactionHash,
				blockNumber: log.blockNumber,
				logIndex: log.index,
				contractAddress: log.address.toLowerCase(),
				topic: parsed.name,
				args: this.serializeEventArgs(parsed),
				timestamp: new Date(block!.timestamp * 1000),
			};
		} catch (error) {
			this.logger.error(`Failed to parse log: ${error.message}`, { log });
			return null;
		}
	}

	private serializeEventArgs(parsed: ethers.LogDescription): Record<string, any> {
		const entries = parsed.args.toArray().map((value, index) => {
			const key = parsed.fragment.inputs[index]?.name || index.toString();

			// Handle type conversions
			if (typeof value === 'bigint') return [key, value.toString()];
			if (ethers.isAddress(value)) return [key, value.toLowerCase()];
			return [key, value];
		});

		return Object.fromEntries(entries);
	}
}

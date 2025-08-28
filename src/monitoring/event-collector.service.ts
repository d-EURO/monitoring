import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DatabaseService } from '../database/database.service';
import { ProviderService } from '../blockchain/provider.service';
import { ContractRegistryService } from './contract-registry.service';
import {
	DecentralizedEUROABI,
	EquityABI,
	DEPSWrapperABI,
	SavingsGatewayABI,
	FrontendGatewayABI,
	MintingHubGatewayABI,
	PositionRollerABI,
	PositionV2ABI,
	StablecoinBridgeABI,
} from '@deuro/eurocoin';

export interface DecodedEvent {
	block_number: number;
	tx_hash: string;
	log_index: number;
	contract_address: string;
	event_name: string;
	event_data: Record<string, any>;
	timestamp: Date;
}

@Injectable()
export class EventCollectorService {
	private readonly logger = new Logger(EventCollectorService.name);
	private abis: Map<string, ethers.Interface> = new Map();

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly providerService: ProviderService,
		private readonly contractRegistry: ContractRegistryService
	) {
		this.initializeABIs();
	}

	/**
	 * Initialize ABI interfaces for event decoding
	 */
	private initializeABIs(): void {
		// Core protocol ABIs
		this.abis.set('DEURO', new ethers.Interface(DecentralizedEUROABI));
		this.abis.set('EQUITY', new ethers.Interface(EquityABI));
		this.abis.set('DEPS', new ethers.Interface(DEPSWrapperABI));
		this.abis.set('SAVINGS', new ethers.Interface(SavingsGatewayABI));
		this.abis.set('FRONTEND_GATEWAY', new ethers.Interface(FrontendGatewayABI));
		this.abis.set('MINTING_HUB', new ethers.Interface(MintingHubGatewayABI));
		this.abis.set('ROLLER', new ethers.Interface(PositionRollerABI));
		this.abis.set('POSITION', new ethers.Interface(PositionV2ABI));
		this.abis.set('BRIDGE', new ethers.Interface(StablecoinBridgeABI));
	}

	/**
	 * Collect all events from a block range
	 */
	async collectEvents(fromBlock: number, toBlock: number): Promise<DecodedEvent[]> {
		const provider = this.providerService.getProvider();
		const contracts = await this.contractRegistry.getActiveContracts();
		const contractAddresses = contracts.map((c) => c.address);

		if (contractAddresses.length === 0) {
			this.logger.warn('No contracts to monitor');
			return [];
		}

		this.logger.log(`Collecting events from blocks ${fromBlock}-${toBlock} for ${contractAddresses.length} contracts`);

		// Fetch logs from all contracts in one call
		const logs = await provider.getLogs({
			address: contractAddresses,
			fromBlock,
			toBlock,
		});

		this.logger.log(`Found ${logs.length} logs to process`);

		// Decode events
		const decodedEvents: DecodedEvent[] = [];
		const blockTimestamps: Map<number, Date> = new Map();

		for (const log of logs) {
			try {
				// Get contract type to select correct ABI
				const contract = this.contractRegistry.getContract(log.address);
				if (!contract) {
					this.logger.warn(`Unknown contract address: ${log.address}`);
					continue;
				}

				const abi = this.abis.get(contract.type);
				if (!abi) {
					this.logger.warn(`No ABI for contract type: ${contract.type}`);
					continue;
				}

				// Try to decode the log
				let decoded: ethers.LogDescription;
				try {
					decoded = abi.parseLog({
						topics: log.topics as string[],
						data: log.data,
					});
				} catch (e) {
					// Log might be from a different interface, skip it
					continue;
				}

				if (!decoded) continue;

				// Get block timestamp (cache to avoid multiple requests)
				if (!blockTimestamps.has(log.blockNumber)) {
					const block = await provider.getBlock(log.blockNumber);
					if (block) {
						blockTimestamps.set(log.blockNumber, new Date(block.timestamp * 1000));
					}
				}

				const timestamp = blockTimestamps.get(log.blockNumber) || new Date();

				// Convert decoded args to plain object
				const eventData: Record<string, any> = {};
				for (let i = 0; i < decoded.args.length; i++) {
					const paramName = decoded.fragment.inputs[i]?.name || `param${i}`;
					const value = decoded.args[i];

					// Convert BigInt to string for JSON storage
					if (typeof value === 'bigint') {
						eventData[paramName] = value.toString();
					} else if (ethers.isAddress(value)) {
						eventData[paramName] = value.toLowerCase();
					} else {
						eventData[paramName] = value;
					}
				}

				decodedEvents.push({
					block_number: log.blockNumber,
					tx_hash: log.transactionHash.toLowerCase(),
					log_index: log.index,
					contract_address: log.address.toLowerCase(),
					event_name: decoded.name,
					event_data: eventData,
					timestamp,
				});
			} catch (error) {
				this.logger.error(`Error decoding log at ${log.transactionHash}:${log.index}:`, error);
				// Store raw event even if decoding fails
				const timestamp = blockTimestamps.get(log.blockNumber) || new Date();
				decodedEvents.push({
					block_number: log.blockNumber,
					tx_hash: log.transactionHash.toLowerCase(),
					log_index: log.index,
					contract_address: log.address.toLowerCase(),
					event_name: 'UNKNOWN',
					event_data: {
						topics: log.topics,
						data: log.data,
						error: error.message,
					},
					timestamp,
				});
			}
		}

		// Persist events to database
		if (decodedEvents.length > 0) {
			await this.persistEvents(decodedEvents);

			// Discover new contracts from events
			await this.contractRegistry.discoverFromEvents(decodedEvents);
		}

		this.logger.log(`Processed ${decodedEvents.length} events`);
		return decodedEvents;
	}

	/**
	 * Persist events to database
	 */
	private async persistEvents(events: DecodedEvent[]): Promise<void> {
		if (events.length === 0) return;

		// Batch insert for performance
		const values = events.map((e) => [
			e.block_number,
			e.tx_hash,
			e.log_index,
			e.contract_address,
			e.event_name,
			JSON.stringify(e.event_data),
			e.timestamp,
		]);

		// Use COPY for bulk insert if many events, otherwise use INSERT
		if (events.length > 100) {
			// For large batches, use a transaction with multiple inserts
			await this.databaseService.withTransaction(async (client) => {
				const query = `
					INSERT INTO raw_events (block_number, tx_hash, log_index, contract_address, event_name, event_data, timestamp)
					VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
					ON CONFLICT (tx_hash, log_index) DO NOTHING
				`;

				for (const value of values) {
					await client.query(query, value);
				}
			});
		} else {
			// For smaller batches, use single multi-value insert
			const placeholders = values
				.map((_, i) => {
					const base = i * 7;
					return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb, $${base + 7})`;
				})
				.join(', ');

			const flatValues = values.flat();

			await this.databaseService.query(
				`
				INSERT INTO raw_events (block_number, tx_hash, log_index, contract_address, event_name, event_data, timestamp)
				VALUES ${placeholders}
				ON CONFLICT (tx_hash, log_index) DO NOTHING
			`,
				flatValues
			);
		}

		this.logger.log(`Persisted ${events.length} events to database`);
	}

	/**
	 * Calculate 24-hour metrics from events
	 */
	async calculate24HourMetrics(): Promise<Record<string, any>> {
		const result = await this.databaseService.query(`
			SELECT 
				COUNT(CASE WHEN event_name = 'Transfer' AND contract_address IN (
					SELECT address FROM contracts WHERE contract_type = 'DEURO'
				) THEN 1 END) as deuro_transfers_24h,
				COUNT(CASE WHEN event_name = 'Transfer' AND contract_address IN (
					SELECT address FROM contracts WHERE contract_type = 'DEPS'
				) THEN 1 END) as deps_transfers_24h,
				COUNT(CASE WHEN event_name = 'Trade' THEN 1 END) as equity_trades_24h,
				COUNT(CASE WHEN event_name = 'Saved' THEN 1 END) as savings_saved_24h,
				COUNT(CASE WHEN event_name = 'Withdrawn' THEN 1 END) as savings_withdrawn_24h,
				COUNT(CASE WHEN event_name = 'PositionOpened' THEN 1 END) as positions_opened_24h,
				COUNT(CASE WHEN event_name = 'ChallengeStarted' THEN 1 END) as challenges_started_24h
			FROM raw_events
			WHERE timestamp > NOW() - INTERVAL '24 hours'
		`);

		return result.rows[0] || {};
	}
}

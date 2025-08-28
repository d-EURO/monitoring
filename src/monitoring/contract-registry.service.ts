import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import { ADDRESS, StablecoinBridgeABI, ERC20ABI } from '@deuro/eurocoin';
import { ethers } from 'ethers';
import { ProviderService } from '../blockchain/provider.service';

export interface Contract {
	address: string;
	type: ContractType;
	createdAtBlock: number;
	metadata?: Record<string, any>;
	isActive: boolean;
}

export enum ContractType {
	DEURO = 'DEURO',
	EQUITY = 'EQUITY',
	DEPS = 'DEPS',
	SAVINGS = 'SAVINGS',
	POSITION = 'POSITION',
	MINTER = 'MINTER',
	BRIDGE = 'BRIDGE',
	FRONTEND_GATEWAY = 'FRONTEND_GATEWAY',
	MINTING_HUB = 'MINTING_HUB',
	ROLLER = 'ROLLER',
}

@Injectable()
export class ContractRegistryService {
	private readonly logger = new Logger(ContractRegistryService.name);
	private contractCache: Map<string, Contract> = new Map();

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly configService: ConfigService,
		private readonly providerService: ProviderService
	) {}

	/**
	 * Initialize registry with core protocol contracts
	 */
	async initialize(): Promise<void> {
		const chainId = this.configService.get('monitoring.blockchainId');
		const deploymentBlock = this.configService.get('monitoring.deploymentBlock');

		// Register core protocol contracts
		const coreContracts: Contract[] = [
			{
				address: ADDRESS[chainId].decentralizedEURO.toLowerCase(),
				type: ContractType.DEURO,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].equity.toLowerCase(),
				type: ContractType.EQUITY,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].DEPSwrapper.toLowerCase(),
				type: ContractType.DEPS,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].savingsGateway.toLowerCase(),
				type: ContractType.SAVINGS,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].frontendGateway.toLowerCase(),
				type: ContractType.FRONTEND_GATEWAY,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].mintingHubGateway.toLowerCase(),
				type: ContractType.MINTING_HUB,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].roller.toLowerCase(),
				type: ContractType.ROLLER,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
		];

		// Persist core contracts to database
		await this.registerContracts(coreContracts);

		// Load all contracts into cache
		await this.loadContracts();

		this.logger.log(`Registry initialized with ${coreContracts.length} core contracts`);
	}

	/**
	 * Get all active contracts
	 */
	async getActiveContracts(): Promise<Contract[]> {
		if (this.contractCache.size === 0) {
			await this.loadContracts();
		}
		return Array.from(this.contractCache.values()).filter((c) => c.isActive);
	}

	/**
	 * Get contracts by type
	 */
	async getContractsByType(type: ContractType): Promise<Contract[]> {
		const contracts = await this.getActiveContracts();
		return contracts.filter((c) => c.type === type);
	}

	/**
	 * Register new contracts (used when discovering positions, minters, etc.)
	 */
	async registerContracts(contracts: Contract[]): Promise<void> {
		if (contracts.length === 0) return;

		const values = contracts.map((c) => [
			c.address.toLowerCase(),
			c.type,
			c.createdAtBlock,
			JSON.stringify(c.metadata || {}),
			c.isActive,
		]);

		const query = `
			INSERT INTO contracts (address, contract_type, created_at_block, metadata, is_active)
			VALUES ($1, $2, $3, $4::jsonb, $5)
			ON CONFLICT (address) DO UPDATE SET
				is_active = EXCLUDED.is_active,
				metadata = EXCLUDED.metadata
		`;

		for (const value of values) {
			await this.databaseService.query(query, value);

			// Update cache
			const contract = {
				address: value[0] as string,
				type: value[1] as ContractType,
				createdAtBlock: value[2] as number,
				metadata: JSON.parse(value[3] as string),
				isActive: value[4] as boolean,
			};
			this.contractCache.set(contract.address, contract);
		}

		this.logger.log(`Registered ${contracts.length} contracts`);
	}

	/**
	 * Discover new contracts (positions & minters) from events
	 */
	async discoverFromEvents(events: any[]): Promise<void> {
		const newContracts: Contract[] = [];

		for (const event of events) {
			if (event.event_name === 'PositionOpened') {
				const positionAddress = event.event_data.position?.toLowerCase();
				const owner = event.event_data.owner?.toLowerCase();
				const original = event.event_data.original?.toLowerCase();
				const collateral = event.event_data.collateral?.toLowerCase();
				const frontendCode = event.event_data.frontendCode;

				if (positionAddress && !this.contractCache.has(positionAddress)) {
					newContracts.push({
						address: positionAddress,
						type: ContractType.POSITION,
						createdAtBlock: event.block_number,
						metadata: {
							owner,
							original,
							collateral,
							...(frontendCode && { frontendCode }),
						},
						isActive: true,
					});
				}
			} else if (event.event_name === 'MinterApplied') {
				const minterAddress = event.event_data.minter?.toLowerCase();

				if (minterAddress && !this.contractCache.has(minterAddress)) {
					const minterType = await this.detectMinterType(minterAddress);

					const metadata: any = {
						applicationPeriod: event.event_data.applicationPeriod,
						applicationFee: event.event_data.applicationFee,
						message: event.event_data.message,
					};

					if (minterType === ContractType.BRIDGE) {
						try {
							const provider = this.providerService.getProvider();
							const bridgeContract = new ethers.Contract(minterAddress, StablecoinBridgeABI, provider);

							const eurAddress = await bridgeContract.eur();
							const tokenContract = new ethers.Contract(eurAddress, ERC20ABI, provider);
							metadata.eurAddress = eurAddress;
							metadata.bridgeSymbol = await tokenContract.symbol();
						} catch (error) {
							this.logger.warn(`Failed to fetch bridge metadata for ${minterAddress}`);
						}
					}

					newContracts.push({
						address: minterAddress,
						type: minterType,
						createdAtBlock: event.block_number,
						metadata,
						isActive: true,
					});
				}
			}
		}

		if (newContracts.length > 0) {
			await this.registerContracts(newContracts);
			this.logger.log(`Discovered ${newContracts.length} new contracts from events`);
		}
	}

	/**
	 * Load all contracts from database into cache
	 */
	private async loadContracts(): Promise<void> {
		const result = await this.databaseService.query(`
			SELECT address, contract_type, created_at_block, metadata, is_active
			FROM contracts
		`);

		this.contractCache.clear();
		for (const row of result.rows) {
			const contract: Contract = {
				address: row.address.toLowerCase(),
				type: row.contract_type as ContractType,
				createdAtBlock: parseInt(row.created_at_block),
				metadata: row.metadata,
				isActive: row.is_active,
			};
			this.contractCache.set(contract.address, contract);
		}

		this.logger.log(`Loaded ${this.contractCache.size} contracts into cache`);
	}

	/**
	 * Get all contract addresses (for event filtering)
	 */
	async getAllAddresses(): Promise<string[]> {
		const contracts = await this.getActiveContracts();
		return contracts.map((c) => c.address);
	}

	/**
	 * Check if an address is a known contract
	 */
	isKnownContract(address: string): boolean {
		return this.contractCache.has(address.toLowerCase());
	}

	/**
	 * Get contract by address
	 */
	getContract(address: string): Contract | undefined {
		return this.contractCache.get(address.toLowerCase());
	}

	/**
	 * Detect whether a minter contract is a bridge or regular minter
	 * Bridges have specific methods like eur(), horizon(), limit(), minted()
	 * Regular minters don't have these methods
	 */
	private async detectMinterType(minterAddress: string): Promise<ContractType.BRIDGE | ContractType.MINTER> {
		try {
			const provider = this.providerService.getProvider();
			const contract = new ethers.Contract(minterAddress, StablecoinBridgeABI, provider);

			await contract.eur();
			this.logger.log(`Detected ${minterAddress} as a bridge`);
			return ContractType.BRIDGE;
		} catch (error) {
			this.logger.log(`Detected ${minterAddress} as a regular minter`);
			return ContractType.MINTER;
		}
	}
}

import { Injectable, Logger } from '@nestjs/common';
import { Contract, ContractType, Event } from './types';
import { AppConfigService } from '../config/config.service';
import { ContractRepository } from './prisma/repositories/contract.repository';
import { ADDRESS, StablecoinBridgeABI } from '@deuro/eurocoin';
import { CONTRACT_ABI_MAP } from './constants';
import { ethers } from 'ethers';
import { ProviderService } from './provider.service';
import { EventsRepository } from './prisma/repositories/events.repository';

@Injectable()
export class ContractService {
	private readonly logger = new Logger(ContractService.name);
	private cache = new Map<string, Contract>();

	constructor(
		private readonly config: AppConfigService,
		private readonly eventsRepo: EventsRepository,
		private readonly contractRepo: ContractRepository,
		private readonly providerService: ProviderService
	) {}

	async initialize(): Promise<void> {
		await this.registerCoreContracts();
		await this.initializeCache();
	}

	private async initializeCache(): Promise<void> {
		const contracts = await this.contractRepo.findAll();

		this.cache.clear();
		for (const contract of contracts) {
			this.cache.set(contract.address.toLowerCase(), contract);
		}

		this.logger.log(`Loaded ${this.cache.size} contracts into cache`);
	}

	private async registerCoreContracts(): Promise<void> {
		const chainId = this.config.blockchainId;
		const deploymentBlock = this.config.deploymentBlock;

		const coreContracts: Contract[] = [
			{
				address: ADDRESS[chainId].decentralizedEURO,
				type: ContractType.DEURO,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].equity,
				type: ContractType.EQUITY,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].DEPSwrapper,
				type: ContractType.DEPS,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].savingsGateway,
				type: ContractType.SAVINGS,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].frontendGateway,
				type: ContractType.FRONTEND_GATEWAY,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].mintingHubGateway,
				type: ContractType.MINTING_HUB,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
			{
				address: ADDRESS[chainId].roller,
				type: ContractType.ROLLER,
				createdAtBlock: deploymentBlock,
				isActive: true,
			},
		];

		await this.contractRepo.createMany(coreContracts);
		this.logger.log(`Registry initialized with ${coreContracts.length} core contracts`);
		this.logger.log(`Registered addresses: ${coreContracts.map((c) => c.address).join(', ')}`);
	}

	async persistContracts(contracts: Contract[]): Promise<void> {
		if (contracts.length === 0) return;

		await this.contractRepo.createMany(contracts);

		// Update cache
		for (const c of contracts) {
			const formattedAddress = c.address.toLowerCase();
			this.cache.set(formattedAddress, {
				...c,
				address: formattedAddress,
			});
		}
	}

	async captureNewContracts(events: Event[]): Promise<boolean> {
		if (events.length === 0) return false;

		let newContracts = (await Promise.all(events.map(this.mapEventToNewContract.bind(this)))).filter(Boolean) as Contract[];
		newContracts = newContracts.filter((nc) => !this.cache.has(nc.address.toLowerCase()));

		if (newContracts.length > 0) {
			await this.persistContracts(newContracts);
			this.logger.log(`Discovered and persisted ${newContracts.length} new contracts`);
			return true;
		}

		return false;
	}

	async getTokensFromContracts(): Promise<string[]> {
		// Only collateral and bridge tokens are relevant
		const collateralTokens = await this.eventsRepo.getCollateralTokens();
		const bridges = await this.contractRepo.getContractsByType(ContractType.BRIDGE);
		const bridgeTokens = await this.fetchBridgeTokenAddress(bridges);

		return [...collateralTokens, ...bridgeTokens];
	}

	// TODO (later): onlyActive means not expired, maybe change contract table isActive to isExpired?
	async getContracts(onlyActive = false): Promise<Contract[]> {
		if (this.cache.size === 0) await this.initializeCache();
		return Array.from(this.cache.values()).filter((c) => (onlyActive ? c.isActive : true));
	}

	async getContract(address: string): Promise<Contract | null> {
		if (this.cache.size === 0) await this.initializeCache();
		return this.cache.get(address.toLowerCase()) || null;
	}

	async getContractAbi(address: string): Promise<any | null> {
		const contract = await this.getContract(address);
		if (!contract) {
			this.logger.warn(`No contract found for address ${address} when fetching ABI`);
			return null;
		}

		const abi = CONTRACT_ABI_MAP[contract.type];
		if (!abi) {
			this.logger.warn(`No ABI mapped for contract type ${contract.type} at address ${address}`);
			return null;
		}

		return abi;
	}

	// Given an event, determine if it indicates a new contract deployment
	private async mapEventToNewContract(event: Event): Promise<Contract | null> {
		if (event.topic === 'PositionOpened') {
			return {
				address: event.args.position,
				type: ContractType.POSITION,
				createdAtBlock: event.blockNumber,
				isActive: true,
				metadata: event.args,
			};
		} else if (event.topic === 'MinterApplied') {
			const isBridge = await this.isStablecoinBridge(event.args.minter);
			return {
				address: event.args.minter,
				type: isBridge ? ContractType.BRIDGE : ContractType.MINTER,
				createdAtBlock: event.blockNumber,
				isActive: true,
				metadata: event.args,
			};
		}
		return null;
	}

	private async isStablecoinBridge(address: string): Promise<boolean> {
		try {
			const contract = new ethers.Contract(address, StablecoinBridgeABI, this.providerService.provider);
			await contract.eur(); // Fails if not a StablecoinBridge
			return true;
		} catch {
			return false;
		}
	}

	private async fetchBridgeTokenAddress(bridges: Contract[]): Promise<string[]> {
		const multicallProvider = this.providerService.multicallProvider;
		const calls: Promise<string | undefined>[] = [];

		for (const bridge of bridges) {
			const contract = new ethers.Contract(bridge.address, StablecoinBridgeABI, multicallProvider);
			calls.push(contract.eur().catch(() => undefined));
		}

		const results = await Promise.all(calls);
		return results.filter((addr): addr is string => addr !== undefined).map((addr) => addr.toLowerCase());
	}
}

import { Injectable, Logger } from '@nestjs/common';
import { Contract, ContractType } from './types';
import { AppConfigService } from '../config/config.service';
import { ContractRepository } from './prisma/repositories/contract.repository';
import { ADDRESS } from '@deuro/eurocoin';
import { CONTRACT_ABI_MAP } from './constants';

@Injectable()
export class ContractService {
	private readonly logger = new Logger(ContractService.name);
	private cache = new Map<string, Contract>();

	constructor(
		private readonly config: AppConfigService,
		private readonly contractRepo: ContractRepository
	) {}

	async initialize(): Promise<void> {
		await this.registerCoreContracts();
		await this.initializeCache();
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
		this.logger.log(`Registered addresses: ${coreContracts.map(c => c.address).join(', ')}`);
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

	private async initializeCache(): Promise<void> {
		const contracts = await this.contractRepo.findAll();

		this.cache.clear();
		for (const contract of contracts) {
			this.cache.set(contract.address.toLowerCase(), contract);
		}

		this.logger.log(`Loaded ${this.cache.size} contracts into cache`);
	}

	async getActiveContracts(): Promise<Contract[]> {
		if (this.cache.size === 0) await this.initializeCache();
		return Array.from(this.cache.values()).filter((c) => c.isActive);
	}

	async getContractsByType(type: ContractType): Promise<Contract[]> {
		const contracts = await this.getActiveContracts();
		return contracts.filter((c) => c.type === type);
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
}

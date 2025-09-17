import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientService } from '../client.service';
import { Contract, ContractType } from '../../types';

@Injectable()
export class ContractRepository {
	private readonly logger = new Logger(ContractRepository.name);

	constructor(private readonly prisma: PrismaClientService) {}

	async createMany(contracts: Contract[]): Promise<void> {
		if (contracts.length === 0) return;

		try {
			const prismaContracts = contracts.map(contract => ({
				...contract,
				address: contract.address.toLowerCase(),
				metadata: contract.metadata || {},
			}));

			await this.prisma.contract.createMany({
				data: prismaContracts,
				skipDuplicates: true
			});

			this.logger.log(`Successfully persisted ${contracts.length} contracts`);
		} catch (error) {
			this.logger.error(`Failed to persist contracts: ${error.message}`);
			throw error;
		}
	}

	async findAll(): Promise<Contract[]> {
		try {
			const contracts = await this.prisma.contract.findMany({
				orderBy: { address: 'asc' }
			});
			return contracts.map(this.mapToContract);
		} catch (error) {
			this.logger.error(`Failed to fetch contracts: ${error.message}`);
			throw error;
		}
	}

	async findAllActive(): Promise<Contract[]> {
		try {
			const contracts = await this.prisma.contract.findMany({
				where: { isActive: true },
				orderBy: { address: 'asc' }
			});
			return contracts.map(this.mapToContract);
		} catch (error) {
			this.logger.error(`Failed to fetch active contracts: ${error.message}`);
			throw error;
		}
	}

	async findByType(contractType: ContractType): Promise<Contract[]> {
		try {
			const contracts = await this.prisma.contract.findMany({
				where: {
					type: contractType,
					isActive: true
				},
				orderBy: { address: 'asc' }
			});
			return contracts.map(this.mapToContract);
		} catch (error) {
			this.logger.error(`Failed to fetch contracts by type ${contractType}: ${error.message}`);
			throw error;
		}
	}

	async findByAddress(address: string): Promise<Contract | null> {
		try {
			const contract = await this.prisma.contract.findUnique({
				where: { address: address.toLowerCase() }
			});
			return contract ? this.mapToContract(contract) : null;
		} catch (error) {
			this.logger.error(`Failed to fetch contract by address ${address}: ${error.message}`);
			return null;
		}
	}

	private mapToContract = (contract: any): Contract => ({
		address: contract.address,
		type: contract.type as ContractType,
		createdAtBlock: contract.createdAtBlock,
		metadata: contract.metadata as Record<string, any> || {},
		isActive: contract.isActive
	});
}
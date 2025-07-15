import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import {
	ADDRESS,
	DecentralizedEUROABI,
	EquityABI,
	DEPSWrapperABI,
	SavingsGatewayABI,
	FrontendGatewayABI,
	MintingHubGatewayABI,
	PositionRollerABI,
} from '@deuro/eurocoin';
import { ContractSet } from './types/contracts';

@Injectable()
export class BlockchainService {
	private readonly logger = new Logger(BlockchainService.name);
	private provider: ethers.Provider;
	private blockchainId: number;
	private contracts: ContractSet;

	constructor(private readonly configService: ConfigService) {
		this.initializeProvider();
		this.createContracts();
	}

	private initializeProvider() {
		const monitoringConfig = this.configService.get('monitoring');
		this.blockchainId = monitoringConfig.blockchainId;
		this.provider = new ethers.JsonRpcProvider(monitoringConfig.rpcUrl);
	}

	private createContracts() {
		this.contracts = {
			deuroContract: new ethers.Contract(ADDRESS[this.blockchainId].decentralizedEURO, DecentralizedEUROABI, this.provider),
			equityContract: new ethers.Contract(ADDRESS[this.blockchainId].equity, EquityABI, this.provider),
			depsContract: new ethers.Contract(ADDRESS[this.blockchainId].DEPSwrapper, DEPSWrapperABI, this.provider),
			savingsContract: new ethers.Contract(ADDRESS[this.blockchainId].savingsGateway, SavingsGatewayABI, this.provider),
			frontendGatewayContract: new ethers.Contract(ADDRESS[this.blockchainId].frontendGateway, FrontendGatewayABI, this.provider),
			mintingHubContract: new ethers.Contract(ADDRESS[this.blockchainId].mintingHubGateway, MintingHubGatewayABI, this.provider),
			rollerContract: new ethers.Contract(ADDRESS[this.blockchainId].roller, PositionRollerABI, this.provider),
		};
	}

	getProvider(): ethers.Provider {
		return this.provider;
	}

	getContracts(): ContractSet {
		return this.contracts;
	}

	getBlockchainId(): number {
		return this.blockchainId;
	}

	getDeploymentBlock(): number {
		return this.configService.get('monitoring').deploymentBlock;
	}
}

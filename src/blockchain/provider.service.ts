import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class ProviderService {
	private readonly logger = new Logger(ProviderService.name);
	private provider: ethers.Provider;
	private blockchainId: number;

	constructor(private readonly configService: ConfigService) {
		this.initializeProvider();
	}

	private initializeProvider() {
		const monitoringConfig = this.configService.get('monitoring');
		this.blockchainId = monitoringConfig.blockchainId;
		this.provider = new ethers.JsonRpcProvider(monitoringConfig.rpcUrl);
		this.logger.log(`Connected to blockchain ${this.blockchainId} at ${monitoringConfig.rpcUrl}`);
	}

	getProvider(): ethers.Provider {
		return this.provider;
	}

	getBlockchainId(): number {
		return this.blockchainId;
	}

	getDeploymentBlock(): number {
		return this.configService.get('monitoring').deploymentBlock;
	}
}
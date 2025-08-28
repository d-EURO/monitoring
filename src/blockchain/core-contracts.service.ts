import { Injectable, Logger } from '@nestjs/common';
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
import { ProviderService } from './provider.service';

/**
 * Service for managing core protocol contracts with fixed addresses.
 */
@Injectable()
export class CoreContractsService {
	private readonly logger = new Logger(CoreContractsService.name);
	private readonly contracts: {
		deuro: ethers.Contract;
		deps: ethers.Contract;
		equity: ethers.Contract;
		savings: ethers.Contract;
		mintingHub: ethers.Contract;
		frontendGateway: ethers.Contract;
		roller: ethers.Contract;
	};

	constructor(private readonly providerService: ProviderService) {
		const provider = this.providerService.getProvider();
		const blockchainId = this.providerService.getBlockchainId();
		const addresses = ADDRESS[blockchainId];

		if (!addresses) {
			throw new Error(`No contract addresses found for blockchain ID ${blockchainId}`);
		}

		this.contracts = {
			deuro: new ethers.Contract(addresses.decentralizedEURO, DecentralizedEUROABI, provider),
			deps: new ethers.Contract(addresses.DEPSwrapper, DEPSWrapperABI, provider),
			equity: new ethers.Contract(addresses.equity, EquityABI, provider),
			savings: new ethers.Contract(addresses.savingsGateway, SavingsGatewayABI, provider),
			mintingHub: new ethers.Contract(addresses.mintingHubGateway, MintingHubGatewayABI, provider),
			frontendGateway: new ethers.Contract(addresses.frontendGateway, FrontendGatewayABI, provider),
			roller: new ethers.Contract(addresses.roller, PositionRollerABI, provider),
		};

		this.logger.log(`Initialized core contracts for blockchain ${blockchainId}`);
	}

	getDeuroContract(): ethers.Contract {
		return this.contracts.deuro;
	}

	getDepsContract(): ethers.Contract {
		return this.contracts.deps;
	}

	getEquityContract(): ethers.Contract {
		return this.contracts.equity;
	}

	getSavingsContract(): ethers.Contract {
		return this.contracts.savings;
	}

	getMintingHubContract(): ethers.Contract {
		return this.contracts.mintingHub;
	}

	getFrontendGatewayContract(): ethers.Contract {
		return this.contracts.frontendGateway;
	}

	getRollerContract(): ethers.Contract {
		return this.contracts.roller;
	}
}

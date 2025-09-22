import { Injectable, Logger } from '@nestjs/common';
import { ContractRepository } from './prisma/repositories/contract.repository';
import { ContractType, MinterState, MinterStatus } from './types';
import { EventsRepository } from './prisma/repositories/events.repository';
import { ProviderService } from './provider.service';
import { ethers } from 'ethers';
import { StablecoinBridgeABI, DecentralizedEUROABI, ADDRESS } from '@deuro/eurocoin';
import { MinterRepository } from './prisma/repositories/minter.repository';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class MinterService {
	private readonly logger = new Logger(MinterService.name);
	private cache = new Set<string>();

	constructor(
		private readonly config: AppConfigService,
		private readonly contractRepo: ContractRepository,
		private readonly eventsRepo: EventsRepository,
		private readonly providerService: ProviderService,
		private readonly minterRepo: MinterRepository
	) {}

	async initialize(): Promise<void> {
		const minters = await this.minterRepo.findAll();
		this.cache = new Set(minters.map((m) => m.address.toLowerCase()));
		this.logger.log(`Loaded ${this.cache.size} minters into cache`);
	}

	async syncMinters(): Promise<void> {
		const bridges = await this.contractRepo.getContractsByType(ContractType.BRIDGE);
		const genericMinters = await this.contractRepo.getContractsByType(ContractType.MINTER);
		const allMinters = [...bridges, ...genericMinters];
		if (!allMinters.length) return;

		const calls = [];
		const multicallProvider = this.providerService.multicallProvider;
		for (const bridge of bridges) {
			const isNew = !this.cache.has(bridge.address.toLowerCase());
			const contract = new ethers.Contract(bridge.address, StablecoinBridgeABI, multicallProvider);
			calls.push(isNew ? contract.eur().catch(() => null) : Promise.resolve(null));
			calls.push(isNew ? contract.horizon().catch(() => null) : Promise.resolve(null));
			calls.push(isNew ? contract.limit().catch(() => null) : Promise.resolve(null));
			calls.push(contract.minted().catch(() => null));
		}

		const results = await Promise.all(calls); // TODO (later): Switch to Promise.allSettled and handle errors
		const deniedMinters = await this.eventsRepo.getDeniedMinters();

		let resultIndex = 0;
		const minterStates: MinterState[] = [];
		const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

		for (const minter of allMinters) {
			const address = minter.address.toLowerCase();
			const metadata = minter.metadata || {};
			const isBridge = minter.type === ContractType.BRIDGE;

			const bridgeToken = isBridge ? results[resultIndex++] : undefined;
			const bridgeHorizon = isBridge ? results[resultIndex++] : undefined;
			const bridgeLimit = isBridge ? results[resultIndex++] : undefined;
			const bridgeMinted = isBridge ? results[resultIndex++] : undefined;

			const applicationTimestamp = BigInt(minter.timestamp);
			const applicationPeriod = BigInt(metadata.applicationPeriod || 0);
			const startTimestamp = applicationTimestamp + applicationPeriod;

			const status = deniedMinters.includes(address)
				? MinterStatus.DENIED
				: isBridge && bridgeHorizon && currentTimestamp > BigInt(bridgeHorizon)
					? MinterStatus.EXPIRED
					: currentTimestamp < startTimestamp
						? MinterStatus.PROPOSED
						: MinterStatus.APPROVED;

			minterStates.push({
				address,
				type: minter.type,
				applicationTimestamp,
				applicationPeriod,
				applicationFee: BigInt(metadata.applicationFee || 0),
				message: metadata.message || '',
				status,
				bridgeToken,
				bridgeHorizon,
				bridgeLimit,
				bridgeMinted,
				timestamp: new Date(),
			});

			this.cache.add(address);
		}

		if (minterStates.length > 0) {
			await this.minterRepo.upsertMany(minterStates);
			this.logger.log(`Synced ${minterStates.length} minter states`);
		}
	}
}

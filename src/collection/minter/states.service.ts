import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ERC20ABI, StablecoinBridgeABI } from '@deuro/eurocoin';
import { MinterRepository, BridgeRepository } from '../../database/repositories';
import { MinterState, MinterStatus } from '../../common/dto/minter.dto';
import { MulticallService } from '../../common/services';
import { StablecoinBridgeState } from 'src/common/dto';

export interface MinterStateData {
	minters: MinterState[];
	bridges: StablecoinBridgeState[];
}

@Injectable()
export class MinterStatesService {
	private readonly logger = new Logger(MinterStatesService.name);

	constructor(
		private readonly minterRepository: MinterRepository,
		private readonly bridgeRepository: BridgeRepository,
		private readonly multicallService: MulticallService
	) {}

	async getMintersState(provider: ethers.Provider): Promise<MinterStateData> {
		this.logger.log('Fetching minters and bridges state...');

		const minters = await this.getAllMinterStates();
		const approvedMinters = minters.filter((m) => m.status === MinterStatus.APPROVED);
		if (approvedMinters.length === 0) return { minters, bridges: [] };

		const bridges = await this.retrieveBridgeStates(
			approvedMinters.map((m) => m.minter),
			provider
		);

		return { minters, bridges };
	}

	private async getAllMinterStates(): Promise<MinterState[]> {
		const [applications, denials] = await Promise.all([
			this.minterRepository.getLatestApplications(),
			this.minterRepository.getLatestDenials(),
		]);

		const denialMap = new Map(denials.map((d) => [d.minter, { date: d.timestamp, message: d.message }]));

		return Promise.all(
			applications.map((a) => {
				const denial = denialMap.get(a.minter);
				const status = this.calculateMinterStatus(a.timestamp, a.application_period, denial?.date);

				return {
					minter: a.minter,
					status,
					applicationDate: a.timestamp,
					applicationPeriod: a.application_period,
					applicationFee: a.application_fee,
					message: a.message,
					denialDate: denial?.date,
					denialMessage: denial?.message,
				};
			})
		);
	}

	private async retrieveBridgeStates(minterAddresses: string[], provider: ethers.Provider): Promise<StablecoinBridgeState[]> {
		this.logger.debug(`Checking ${minterAddresses.length} minters for bridge contracts using multicall...`);

		const bridgeCalls: Promise<any>[] = [];
		for (const address of minterAddresses) {
			const bridgeContract = new ethers.Contract(address, StablecoinBridgeABI, provider);
			const multicallBridge = this.multicallService.connect(bridgeContract, provider);
			bridgeCalls.push(
				multicallBridge.eur().catch(() => null),
				multicallBridge.dEURO().catch(() => null),
				multicallBridge.limit().catch(() => 0n),
				multicallBridge.minted().catch(() => 0n),
				multicallBridge.horizon().catch(() => 0n)
			);
		}

		try {
			const results = await this.multicallService.executeBatch(bridgeCalls);

			// Process results
			const bridges: StablecoinBridgeState[] = [];
			const validBridges: { address: string; eurAddress: string; data: any[] }[] = [];
			for (let i = 0; i < minterAddresses.length; i++) {
				try {
					const baseIndex = i * 5;
					const eurAddress = results[baseIndex];
					const dEuroAddress = results[baseIndex + 1];
					const limit = results[baseIndex + 2];
					const minted = results[baseIndex + 3];
					const horizon = results[baseIndex + 4];

					if (eurAddress && eurAddress !== null && dEuroAddress && dEuroAddress !== null) {
						validBridges.push({
							address: minterAddresses[i],
							eurAddress,
							data: [dEuroAddress, limit, minted, horizon],
						});
					}
				} catch {
					// Not a bridge, skip
				}
			}

			if (validBridges.length === 0) {
				return [];
			}

			// Get EUR token info for all valid bridges
			const eurTokenCalls: Promise<any>[] = [];
			for (const { eurAddress } of validBridges) {
				const eurContract = new ethers.Contract(eurAddress, ERC20ABI, provider);
				const multicallEur = this.multicallService.connect(eurContract, provider);
				eurTokenCalls.push(multicallEur.symbol(), multicallEur.decimals());
			}

			const eurTokenResults = await this.multicallService.executeBatch(eurTokenCalls);

			// Build final bridge data
			for (let i = 0; i < validBridges.length; i++) {
				const { address, eurAddress, data } = validBridges[i];
				const [dEuroAddress, limit, minted, horizon] = data;
				const eurSymbol = eurTokenResults[i * 2];
				const eurDecimals = eurTokenResults[i * 2 + 1];
				bridges.push({
					address,
					eurAddress,
					eurSymbol,
					eurDecimals,
					dEuroAddress,
					limit,
					minted,
					horizon,
				});
			}

			this.logger.log(`Found ${bridges.length} bridge contracts out of ${minterAddresses.length} approved minters`);
			return bridges;
		} catch (error) {
			this.logger.error('Failed to check bridges with multicall:', error);
			return [];
		}
	}

	async persistFullMintersState(client: any, mintersState: MinterStateData, blockNumber: number): Promise<void> {
		const { minters, bridges } = mintersState;
		if (minters.length === 0 && bridges.length === 0) return;

		this.logger.log(`Persisting ${minters.length} minters and ${bridges.length} bridges state at block ${blockNumber}`);
		await this.persistBridgesState(client, bridges, blockNumber);
		await this.persistMintersState(client, minters, blockNumber);
	}

	private calculateMinterStatus(applicationTimestamp: Date, applicationPeriod: string | bigint, denialTimestamp?: Date): MinterStatus {
		if (denialTimestamp && denialTimestamp > applicationTimestamp) return MinterStatus.DENIED;

		const applicationEndTime = new Date(applicationTimestamp).getTime() + Number(applicationPeriod) * 1000;
		if (Date.now() < applicationEndTime) return MinterStatus.PENDING;
		return MinterStatus.APPROVED;
	}

	private async persistBridgesState(client: any, bridges: StablecoinBridgeState[], blockNumber: number): Promise<void> {
		if (bridges.length === 0) return;
		this.logger.log(`Persisting ${bridges.length} bridge states...`);
		try {
			await this.bridgeRepository.saveBridgeStates(client, bridges, blockNumber);
			this.logger.log('Bridge states persisted successfully');
		} catch (error) {
			this.logger.error('Failed to persist bridge states:', error);
			throw error;
		}
	}

	private async persistMintersState(client: any, minters: MinterState[], blockNumber: number): Promise<void> {
		if (minters.length === 0) return;
		this.logger.log(`Persisting ${minters.length} minter states...`);
		try {
			await this.minterRepository.saveMinterStates(client, minters, blockNumber);
			this.logger.log('Minter states persisted successfully');
		} catch (error) {
			this.logger.error('Failed to persist minter states:', error);
			throw error;
		}
	}
}

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { StablecoinBridgeABI } from '@deuro/eurocoin';
import { MinterRepository, BridgeRepository } from '../../database/repositories';
import { MinterState, MinterStatus } from '../../common/dto/minter.dto';
import { MulticallService } from '../../common/services';
import { StablecoinBridgeState } from 'src/common/dto';

@Injectable()
export class MinterStatesService {
	private readonly logger = new Logger(MinterStatesService.name);

	constructor(
		private readonly minterRepository: MinterRepository,
		private readonly bridgeRepository: BridgeRepository,
		private readonly multicallService: MulticallService
	) {}

	async getMintersState(provider: ethers.Provider): Promise<{ minters: MinterState[]; bridges: StablecoinBridgeState[] }> {
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
			applications.map(async (a) => {
				const denial = denialMap.get(a.minter);
				const status = this.calculateMinterStatus(a.timestamp, a.application_period, denial?.date);
				const deuroMinted = await this.minterRepository.getTotalMintedByMinter(a.minter).catch(() => BigInt(0));
				const deuroBurned = await this.minterRepository.getTotalBurnedByMinter(a.minter).catch(() => BigInt(0));

				return {
					minter: a.minter,
					status,
					applicationDate: a.timestamp,
					applicationPeriod: a.application_period,
					applicationFee: a.application_fee,
					message: a.message,
					denialDate: denial?.date,
					denialMessage: denial?.message,
					deuroMinted: deuroMinted.toString(),
					deuroBurned: deuroBurned.toString(),
				};
			})
		);
	}

	private async retrieveBridgeStates(minterAddresses: string[], provider: ethers.Provider): Promise<StablecoinBridgeState[]> {
		this.logger.debug(`Checking ${minterAddresses.length} minters for bridge contracts using multicall...`);

		const bridgeCalls = minterAddresses.flatMap((address) => {
			const bridgeContract = new ethers.Contract(address, StablecoinBridgeABI, provider);
			return [
				{ contract: bridgeContract, method: 'eur' },
				{ contract: bridgeContract, method: 'dEURO' },
				{ contract: bridgeContract, method: 'limit' },
				{ contract: bridgeContract, method: 'minted' },
				{ contract: bridgeContract, method: 'horizon' },
			];
		});

		try {
			const results = await this.multicallService.executeBatch(provider, bridgeCalls);

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

					if (eurAddress && dEuroAddress) {
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
			const eurTokenCalls = validBridges.flatMap(({ eurAddress }) => {
				const eurContract = new ethers.Contract(
					eurAddress,
					['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
					provider
				);
				return [
					{ contract: eurContract, method: 'symbol' },
					{ contract: eurContract, method: 'decimals' },
				];
			});

			const eurTokenResults = await this.multicallService.executeBatch(provider, eurTokenCalls);

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

	private calculateMinterStatus(applicationTimestamp: Date, applicationPeriod: string | bigint, denialTimestamp?: Date): MinterStatus {
		if (denialTimestamp && denialTimestamp > applicationTimestamp) return MinterStatus.DENIED;

		const now = Date.now();
		const applicationEndTime = new Date(applicationTimestamp).getTime() + Number(applicationPeriod) * 1000;
		if (now < applicationEndTime) return MinterStatus.PENDING;
		return MinterStatus.APPROVED;
	}

	async persistBridgesState(client: any, bridges: StablecoinBridgeState[], blockNumber: number): Promise<void> {
		if (bridges.length === 0) return;
		await this.bridgeRepository.saveBridgeStates(client, bridges, blockNumber);
	}

	async persistMintersState(client: any, minters: MinterState[], blockNumber: number): Promise<void> {
		if (minters.length === 0) return;
		await this.minterRepository.saveMinterStates(client, minters, blockNumber);
	}
}

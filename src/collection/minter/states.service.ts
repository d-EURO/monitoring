import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DatabaseService } from '../../database/database.service';
import { StablecoinBridgeABI } from '@deuro/eurocoin';
import { MinterRepository, BridgeRepository } from '../../database/repositories';
import { MinterStatus } from '../../common/dto/minter.dto';
import { calculateMinterStatus } from '../../common/utils/minter-status.util';

export interface MinterStateData {
	minter: string;
	status: MinterStatus;
	applicationDate: Date;
	applicationPeriod: bigint;
	applicationFee: bigint;
	message: string;
	denialDate?: Date;
	denialMessage?: string;
}

export interface BridgeStateData {
	address: string;
	eurAddress: string;
	eurSymbol: string;
	eurDecimals: number;
	dEuroAddress: string;
	limit: bigint;
	minted: bigint;
	horizon: bigint;
}

@Injectable()
export class MinterStatesService {
	private readonly logger = new Logger(MinterStatesService.name);

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly minterRepository: MinterRepository,
		private readonly bridgeRepository: BridgeRepository
	) {}

	async getMintersState(provider: ethers.Provider): Promise<{ minters: MinterStateData[]; bridges: BridgeStateData[] }> {
		this.logger.log('Fetching minters and bridges state...');

		// Get all minter states from events
		const minters = await this.getAllMinterStates();

		// Check each minter to see if it's a bridge
		const bridges: BridgeStateData[] = [];
		for (const minter of minters) {
			if (minter.status === MinterStatus.APPROVED) {
				const bridgeData = await this.checkIfBridge(minter.minter, provider);
				if (bridgeData) {
					bridges.push(bridgeData);
				}
			}
		}

		return { minters, bridges };
	}

	private async getAllMinterStates(): Promise<MinterStateData[]> {
		const [applications, denials] = await Promise.all([
			this.minterRepository.getLatestApplications(),
			this.minterRepository.getLatestDenials(),
		]);

		const denialMap = new Map(denials.map((d) => [d.minter, { date: d.timestamp, message: d.message }]));

		return applications.map((a) => {
			const denial = denialMap.get(a.minter);
			const status = calculateMinterStatus(a.timestamp, a.application_period, denial?.date);

			return {
				minter: a.minter,
				status,
				applicationDate: a.timestamp,
				applicationPeriod: BigInt(a.application_period),
				applicationFee: BigInt(a.application_fee),
				message: a.message,
				denialDate: denial?.date,
				denialMessage: denial?.message,
			};
		});
	}

	private async checkIfBridge(minterAddress: string, provider: ethers.Provider): Promise<BridgeStateData | null> {
		try {
			const bridgeContract = new ethers.Contract(minterAddress, StablecoinBridgeABI, provider);

			const [eurAddress, dEuroAddress, limit, minted, horizon] = await Promise.all([
				bridgeContract.eur(),
				bridgeContract.dEURO(),
				bridgeContract.limit(),
				bridgeContract.minted(),
				bridgeContract.horizon(),
			]);

			const eurContract = new ethers.Contract(
				eurAddress,
				['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
				provider
			);

			const [eurSymbol, eurDecimals] = await Promise.all([eurContract.symbol(), eurContract.decimals()]);

			return {
				address: minterAddress,
				eurAddress,
				eurSymbol,
				eurDecimals,
				dEuroAddress,
				limit,
				minted,
				horizon,
			};
		} catch (error) {
			// Not a bridge contract or error fetching data
			return null;
		}
	}

	async persistBridgesState(bridges: BridgeStateData[], blockNumber: number): Promise<void> {
		if (bridges.length === 0) return;

		await this.databaseService.withTransaction(async (client) => {
			await this.bridgeRepository.saveBridgeStates(client, bridges, blockNumber);
		});
	}
}

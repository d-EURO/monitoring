import { Injectable } from '@nestjs/common';
import { MinterRepository, BridgeRepository } from '../../database/repositories';
import { MinterState } from '../../common/dto/minter.dto';
import { BridgeStateDto } from '../../common/dto/stablecoinBridge.dto';
import { calculateMinterStatus } from '../../common/utils/minter-status.util';

@Injectable()
export class MinterService {
	constructor(
		private readonly minterRepository: MinterRepository,
		private readonly bridgeRepository: BridgeRepository
	) {}

	async getAllMinters(): Promise<MinterState[]> {
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
				applicationPeriod: a.application_period,
				applicationFee: a.application_fee,
				message: a.message,
				denialDate: denial?.date,
				denialMessage: denial?.message,
			};
		});
	}

	async getActiveBridges(): Promise<BridgeStateDto[]> {
		const allBridges = await this.getAllBridges();
		const currentTime = Math.floor(Date.now() / 1000);
		return allBridges.filter((bridge) => {
			const horizonTime = parseInt(bridge.horizon);
			return currentTime <= horizonTime;
		});
	}

	async getAllBridges(): Promise<BridgeStateDto[]> {
		const bridgeStates = await this.bridgeRepository.getAllBridgeStates();

		return bridgeStates.map((state) => ({
			address: state.bridge_address,
			eurAddress: state.eur_address,
			eurSymbol: state.eur_symbol,
			eurDecimals: state.eur_decimals,
			dEuroAddress: state.deuro_address,
			limit: state.limit.toString(),
			minted: state.minted.toString(),
			horizon: state.horizon.toString(),
		}));
	}
}

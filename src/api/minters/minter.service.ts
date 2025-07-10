import { Injectable } from '@nestjs/common';
import { MinterRepository, BridgeRepository } from '../../database/repositories';
import { MinterStateDto } from '../../common/dto/minter.dto';
import { BridgeStateDto } from '../../common/dto/stablecoinBridge.dto';

@Injectable()
export class MinterService {
	constructor(
		private readonly minterRepository: MinterRepository,
		private readonly bridgeRepository: BridgeRepository
	) {}

	async getAllMinters(): Promise<MinterStateDto[]> {
		return this.minterRepository.getAllMinterStates();
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
			...state,
			limit: state.limit.toString(),
			minted: state.minted.toString(),
			horizon: state.horizon.toString(),
		}));
	}
}

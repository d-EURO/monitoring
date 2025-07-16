import { Injectable } from '@nestjs/common';
import { MinterRepository, BridgeRepository } from '../../database/repositories';
import { MinterState, MinterStateDto } from '../../common/dto/minter.dto';
import { StablecoinBridgeState, BridgeStateDto } from '../../common/dto/stablecoinBridge.dto';

@Injectable()
export class MinterService {
	constructor(
		private readonly minterRepository: MinterRepository,
		private readonly bridgeRepository: BridgeRepository
	) {}

	async getAllMinters(): Promise<MinterStateDto[]> {
		const minters = await this.minterRepository.getAllMinterStates();
		return minters.map(this.mapToDto);
	}

	async getActiveBridges(): Promise<BridgeStateDto[]> {
		const allBridges = await this.bridgeRepository.getAllBridgeStates();
		const currentTime = BigInt(Math.floor(Date.now() / 1000));
		return allBridges
			.filter((bridge) => bridge.horizon > currentTime)
			.map(this.mapBridgeToDto);
	}

	async getAllBridges(): Promise<BridgeStateDto[]> {
		const bridgeStates = await this.bridgeRepository.getAllBridgeStates();
		return bridgeStates.map(this.mapBridgeToDto);
	}

	private mapToDto(minter: MinterState): MinterStateDto {
		return {
			minter: minter.minter,
			status: minter.status,
			applicationDate: minter.applicationDate,
			applicationPeriod: minter.applicationPeriod,
			applicationFee: minter.applicationFee,
			message: minter.message,
			denialDate: minter.denialDate,
			denialMessage: minter.denialMessage,
		};
	}

	private mapBridgeToDto(bridge: StablecoinBridgeState): BridgeStateDto {
		return {
			address: bridge.address,
			eurAddress: bridge.eurAddress,
			eurSymbol: bridge.eurSymbol,
			eurDecimals: bridge.eurDecimals,
			dEuroAddress: bridge.dEuroAddress,
			limit: bridge.limit.toString(),
			minted: bridge.minted.toString(),
			horizon: bridge.horizon.toString(),
		};
	}
}

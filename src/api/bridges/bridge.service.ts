import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { MinterService } from '../minters/minter.service';
import { BridgeStateDto, Bridge } from '../../common/dto/stablecoinBridge.dto';
import { StablecoinBridgeABI } from '@deuro/eurocoin';

@Injectable()
export class BridgeService {
	constructor(
		private readonly minterService: MinterService,
		private readonly blockchainService: BlockchainService,
	) {}

	async getAllBridges(): Promise<BridgeStateDto[]> {
		const allMinters = await this.minterService.getAllMinters();
		
		const bridges: BridgeStateDto[] = [];
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();
		
		for (const minter of allMinters) {
			const bridgeData = await this.checkIfBridge(minter.minter, provider);
			if (bridgeData) {
				bridges.push({
					...bridgeData,
					minterStatus: minter.status, // Include the minter status
					block_number: currentBlock,
					timestamp: new Date(),
				});
			}
		}
		
		return bridges;
	}

	/**
	 * Get only active (non-expired) bridges
	 */
	async getActiveBridges(): Promise<BridgeStateDto[]> {
		const allBridges = await this.getAllBridges();
		const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
		
		// Filter out expired bridges (where current time > horizon)
		return allBridges.filter(bridge => {
			const horizonTime = parseInt(bridge.horizon);
			return currentTime <= horizonTime;
		});
	}

	private async checkIfBridge(minterAddress: string, provider: ethers.Provider): Promise<Omit<BridgeStateDto, 'block_number' | 'timestamp' | 'minterStatus'> | null> {
		try {
			const bridgeContract = new ethers.Contract(
				minterAddress,
				StablecoinBridgeABI,
				provider
			);

			const [eurAddress, dEuroAddress, limit, minted, horizon] = await Promise.all([
				bridgeContract.eur(),
				bridgeContract.dEURO(),
				bridgeContract.limit(),
				bridgeContract.minted(),
				bridgeContract.horizon(),
			]);

			const eurContract = new ethers.Contract(
				eurAddress,
				[
					'function symbol() view returns (string)',
					'function decimals() view returns (uint8)',
				],
				provider
			);

			const [eurSymbol, eurDecimals] = await Promise.all([
				eurContract.symbol(),
				eurContract.decimals(),
			]);

			return {
				bridgeType: this.getBridgeTypeFromSymbol(eurSymbol),
				address: minterAddress,
				eurAddress,
				eurSymbol,
				eurDecimals,
				dEuroAddress,
				limit: limit.toString(),
				minted: minted.toString(),
				horizon: horizon.toString(),
			};
		} catch (error) {
			// Not a bridge contract or error fetching data
			return null;
		}
	}

	private getBridgeTypeFromSymbol(symbol: string): Bridge {
		const symbolToBridge: { [key: string]: Bridge } = {
			'EURT': Bridge.EURT,
			'EURS': Bridge.EURS,
			'VEUR': Bridge.VEUR,
			'EURC': Bridge.EURC,
			'EURR': Bridge.EURR,
			'EUROP': Bridge.EUROP,
			'EURI': Bridge.EURI,
			'EURE': Bridge.EURE,
		};
		return symbolToBridge[symbol] || Bridge.EURT;
	}
}
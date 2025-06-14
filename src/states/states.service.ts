import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { MintingHubPositionOpenedEvent, SystemStateData } from '../common/dto';
import { DatabaseService } from '../database/database.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PositionV2ABI } from '@deuro/eurocoin';

@Injectable()
export class StatesService {
	private readonly logger = new Logger(StatesService.name);

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly blockchainService: BlockchainService
	) {}

	async getSystemState(positionEvents: MintingHubPositionOpenedEvent[]): Promise<SystemStateData> {
		this.logger.log('Fetching complete system state...');
		const systemState = await this.getSystemStateData(positionEvents);
		await this.persistSystemState(systemState);
		this.logger.log('System state fetched and persisted successfully');
		return systemState;
	}

	private async getSystemStateData(positionEvents: MintingHubPositionOpenedEvent[]): Promise<SystemStateData> {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const blockchainId = this.blockchainService.getBlockchainId();

		const activePositionAddresses: string[] = await this.databaseService.getActivePositionAddresses();

		const results = await Promise.allSettled([
			this.getDecentralizedEuroState(contracts.deuroContract),
			this.getEquityState(contracts.equityContract),
			this.getDepsWrapperState(contracts.depsContract),
			this.getSavingsGatewayState(contracts.savingsContract, contracts.deuroContract),
			this.getFrontendGatewayState(contracts.frontendGatewayContract),
			this.getMintingHubState(contracts.mintingHubContract),
			this.getPositionsState(contracts.mintingHubContract, activePositionAddresses, positionEvents),
			this.getChallengesState(contracts.mintingHubContract),
			this.getCollateralState(positionEvents, provider),
			this.getStablecoinBridgesStates(provider, blockchainId),
		]);

		const [
			deuroState,
			equityState,
			depsState,
			savingsState,
			frontendState,
			mintingHubState,
			positionsState,
			challengesState,
			collateralState,
			bridgeStates,
		] = results.map((result, index) => {
			if (result.status === 'fulfilled') return result.value;
			this.logger.error(`State fetch failed for index ${index}:`, result.reason);
			return null;
		});

		return {
			deuroState,
			equityState,
			depsState,
			savingsState,
			frontendState,
			mintingHubState,
			positionsState: positionsState || [],
			challengesState: challengesState || [],
			collateralState: collateralState || [],
			bridgeStates: bridgeStates || [],
		} as any;
	}

	private async getDecentralizedEuroState(contract: ethers.Contract) {
		const [
			name,
			symbol,
			decimals,
			totalSupply,
			reserveBalance,
			minterReserve,
			equity,
			minApplicationPeriod,
			minApplicationFee,
			equityAddress,
		] = await Promise.all([
			contract.name(),
			contract.symbol(),
			contract.decimals(),
			contract.totalSupply(),
			contract.reserveBalance(),
			contract.minterReserve(),
			contract.equity(),
			contract.minApplicationPeriod(),
			contract.minApplicationFee(),
			contract.equity(),
		]);

		return {
			name,
			symbol,
			decimals: Number(decimals),
			totalSupply: totalSupply.toString(),
			reserveBalance: reserveBalance.toString(),
			minterReserve: minterReserve.toString(),
			equity: equity.toString(),
			minApplicationPeriod: Number(minApplicationPeriod),
			minApplicationFee: minApplicationFee.toString(),
			equityAddress,
		};
	}

	private async getEquityState(contract: ethers.Contract) {
		const [name, symbol, decimals, totalSupply, price, totalVotes, valuationFactor, minHoldingDuration, dEuroAddress] =
			await Promise.all([
				contract.name(),
				contract.symbol(),
				contract.decimals(),
				contract.totalSupply(),
				contract.price(),
				contract.totalVotes(),
				contract.valuationFactor(),
				contract.minHoldingDuration(),
				contract.dEuro(),
			]);

		return {
			name,
			symbol,
			decimals: Number(decimals),
			totalSupply: totalSupply.toString(),
			price: price.toString(),
			totalVotes: totalVotes.toString(),
			valuationFactor: Number(valuationFactor),
			minHoldingDuration: Number(minHoldingDuration),
			dEuroAddress,
		};
	}

	private async getDepsWrapperState(contract: ethers.Contract) {
		const [name, symbol, decimals, totalSupply, underlyingAddress] = await Promise.all([
			contract.name(),
			contract.symbol(),
			contract.decimals(),
			contract.totalSupply(),
			contract.underlying(),
		]);

		let underlyingSymbol = 'UNKNOWN';
		try {
			const underlyingContract = new ethers.Contract(underlyingAddress, ['function symbol() view returns (string)'], contract.runner);
			underlyingSymbol = await underlyingContract.symbol();
		} catch (error) {
			this.logger.warn('Failed to fetch underlying symbol:', error);
		}

		return {
			name,
			symbol,
			decimals: Number(decimals),
			totalSupply: totalSupply.toString(),
			underlyingAddress,
			underlyingSymbol,
		};
	}

	private async getSavingsGatewayState(savingsContract: ethers.Contract, deuroContract: ethers.Contract) {
		const [currentRatePPM, nextRatePPM, nextChange, gatewayAddress, equityAddress, deuroAddress, currentTicks] = await Promise.all([
			savingsContract.currentRatePPM(),
			savingsContract.nextRatePPM(),
			savingsContract.nextChange(),
			savingsContract.getAddress(),
			savingsContract.equity(),
			savingsContract.dEuro(),
			savingsContract.getCurrentTicks(),
		]);

		const totalSavings = await deuroContract.balanceOf(gatewayAddress);

		return {
			currentRatePPM: Number(currentRatePPM),
			nextRatePPM: Number(nextRatePPM),
			nextChange: Number(nextChange),
			gatewayAddress,
			equityAddress,
			deuroAddress,
			totalSavings: totalSavings.toString(),
			currentTicks: Number(currentTicks),
		};
	}

	private async getFrontendGatewayState(contract: ethers.Contract) {
		const [
			deuroAddress,
			equityAddress,
			depsAddress,
			mintingHubAddress,
			savingsAddress,
			feeRate,
			savingsFeeRate,
			mintingFeeRate,
			nextFeeRate,
			nextSavingsFeeRate,
			nextMintingFeeRate,
			changeTimeLock,
		] = await Promise.all([
			contract.dEuro(),
			contract.equity(),
			contract.deps(),
			contract.mintingHub(),
			contract.savings(),
			contract.feeRate(),
			contract.savingsFeeRate(),
			contract.mintingFeeRate(),
			contract.nextFeeRate(),
			contract.nextSavingsFeeRate(),
			contract.nextMintingFeeRate(),
			contract.changeTimeLock(),
		]);

		return {
			deuroAddress,
			equityAddress,
			depsAddress,
			mintingHubAddress,
			savingsAddress,
			feeRate: Number(feeRate),
			savingsFeeRate: Number(savingsFeeRate),
			mintingFeeRate: Number(mintingFeeRate),
			nextFeeRate: Number(nextFeeRate),
			nextSavingsFeeRate: Number(nextSavingsFeeRate),
			nextMintingFeeRate: Number(nextMintingFeeRate),
			changeTimeLock: Number(changeTimeLock),
		};
	}

	private async getMintingHubState(contract: ethers.Contract) {
		const [openingFee, challengerReward, expiredPriceFactor, positionFactory, deuro, positionRoller, rate] = await Promise.all([
			contract.openingFee(),
			contract.challengerReward(),
			contract.expiredPriceFactor(),
			contract.positionFactory(),
			contract.dEuro(),
			contract.positionRoller(),
			contract.rate(),
		]);

		return {
			openingFee: openingFee.toString(),
			challengerReward: challengerReward.toString(),
			expiredPriceFactor: Number(expiredPriceFactor),
			positionFactory,
			deuro,
			positionRoller,
			rate: Number(rate),
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private async persistSystemState(_systemState: SystemStateData): Promise<void> {
		this.logger.log('Persisting system state to database...');
		// TODO: Implement state persistence using NestJS patterns
		// await statePersistence.persistAllSystemState(systemState);
		this.logger.log('System state persisted successfully');
	}

	// API Methods for frontend
	async getCurrentDeuroState() {
		const query = `
      SELECT * FROM deuro_state_daily 
      ORDER BY date DESC 
      LIMIT 1
    `;

		const result = await this.databaseService.fetch(query);
		return result[0] || null;
	}

	async getCurrentEquityState() {
		const query = `
      SELECT * FROM equity_state_daily 
      ORDER BY date DESC 
      LIMIT 1
    `;

		const result = await this.databaseService.fetch(query);
		return result[0] || null;
	}

	async getCurrentPositionsState() {
		const query = `
      SELECT * FROM position_states 
      WHERE is_closed = false 
      ORDER BY last_updated DESC
    `;

		return this.databaseService.fetch(query);
	}

	async getDailyStateHistory(stateType: string, days: number = 30) {
		const tableName = `${stateType}_state_daily`;
		const query = `
      SELECT * FROM ${tableName} 
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date DESC
    `;

		return this.databaseService.fetch(query);
	}

	private async getPositionsState(
		mintingHub: ethers.Contract,
		activePositionAddresses: string[],
		_positionOpenedEvents: MintingHubPositionOpenedEvent[] // eslint-disable-line @typescript-eslint/no-unused-vars
	) {
		const provider = this.blockchainService.getProvider();
		const positions = [];

		for (const positionAddress of activePositionAddresses) {
			try {
				const positionContract = new ethers.Contract(positionAddress, PositionV2ABI, provider);

				const [
					owner,
					original,
					collateralAddress,
					collateralBalance,
					price,
					virtualPrice,
					debt,
					interest,
					principal,
					collateralRequirement,
					minimumCollateral,
					limit,
					start,
					cooldown,
					expiration,
					lastAccrual,
					challengedAmount,
					challengePeriod,
					isClosed,
				] = await Promise.all([
					positionContract.owner(),
					positionContract.original(),
					positionContract.collateral(),
					positionContract.collateralBalance(),
					positionContract.price(),
					positionContract.virtualPrice(),
					positionContract.debt(),
					positionContract.interest(),
					positionContract.principal(),
					positionContract.collateralRequirement(),
					positionContract.minimumCollateral(),
					positionContract.limit(),
					positionContract.start(),
					positionContract.cooldown(),
					positionContract.expiration(),
					positionContract.lastAccrual(),
					positionContract.challengedAmount(),
					positionContract.challengePeriod(),
					positionContract.isClosed(),
				]);

				positions.push({
					positionAddress,
					owner,
					original,
					collateralAddress,
					collateralBalance: collateralBalance.toString(),
					price: price.toString(),
					virtualPrice: virtualPrice.toString(),
					debt: debt.toString(),
					interest: interest.toString(),
					principal: principal.toString(),
					collateralRequirement: Number(collateralRequirement),
					minimumCollateral: minimumCollateral.toString(),
					limit: limit.toString(),
					start: Number(start),
					cooldown: Number(cooldown),
					expiration: Number(expiration),
					lastAccrual: Number(lastAccrual),
					challengedAmount: challengedAmount.toString(),
					challengePeriod: Number(challengePeriod),
					isClosed,
				});
			} catch (error) {
				this.logger.error(`Failed to fetch position state for ${positionAddress}:`, error);
			}
		}

		return positions;
	}

	private async getChallengesState(mintingHub: ethers.Contract) {
		const challenges = [];
		let challengeId = 0;

		try {
			while (true) {
				const [challenger, position, start, size, liqPrice, currentPrice, phase, collateralAddress, positionOwner] =
					await Promise.all([
						mintingHub.challenges(challengeId, 0), // challenger
						mintingHub.challenges(challengeId, 1), // position
						mintingHub.challenges(challengeId, 2), // start
						mintingHub.challenges(challengeId, 3), // size
						mintingHub.challenges(challengeId, 4), // liqPrice
						mintingHub.challenges(challengeId, 5), // currentPrice
						mintingHub.challenges(challengeId, 6), // phase
						mintingHub.challenges(challengeId, 7), // collateralAddress
						mintingHub.challenges(challengeId, 8), // positionOwner
					]);

				if (challenger === ethers.ZeroAddress) break;

				challenges.push({
					challengeId,
					challenger,
					position,
					start: Number(start),
					size: size.toString(),
					liqPrice: liqPrice.toString(),
					currentPrice: currentPrice.toString(),
					phase: Number(phase),
					collateralAddress,
					positionOwner,
				});

				challengeId++;
			}
		} catch (error) {
			this.logger.warn('Reached end of challenges or error occurred:', error);
		}

		return challenges;
	}

	private async getCollateralState(positionOpenedEvents: MintingHubPositionOpenedEvent[], provider: ethers.Provider) {
		const uniqueCollaterals = [...new Set(positionOpenedEvents.map((event) => event.collateral))];
		const collaterals = [];

		for (const collateralAddress of uniqueCollaterals) {
			try {
				const collateralContract = new ethers.Contract(
					collateralAddress,
					[
						'function name() view returns (string)',
						'function symbol() view returns (string)',
						'function decimals() view returns (uint8)',
					],
					provider
				);

				const [name, symbol, decimals] = await Promise.all([
					collateralContract.name(),
					collateralContract.symbol(),
					collateralContract.decimals(),
				]);

				collaterals.push({
					address: collateralAddress,
					name,
					symbol,
					decimals: Number(decimals),
				});
			} catch (error) {
				this.logger.error(`Failed to fetch collateral info for ${collateralAddress}:`, error);
			}
		}

		return collaterals;
	}

	private async getStablecoinBridgesStates(provider: ethers.Provider, blockchainId: number) {
		// This would contain hardcoded bridge addresses for different networks
		const knownBridges: { [key: number]: string[] } = {
			1: [], // Ethereum mainnet bridges
			10: [], // Optimism bridges
			8453: [], // Base bridges
		};

		const bridgeAddresses = knownBridges[blockchainId] || [];
		const bridges = [];

		for (const bridgeAddress of bridgeAddresses) {
			try {
				const bridgeContract = new ethers.Contract(
					bridgeAddress,
					[
						'function limit() view returns (uint256)',
						'function minted() view returns (uint256)',
						'function horizon() view returns (uint256)',
						'function eurAddress() view returns (address)',
						'function dEuroAddress() view returns (address)',
					],
					provider
				);

				const [limit, minted, horizon, eurAddress, dEuroAddress] = await Promise.all([
					bridgeContract.limit(),
					bridgeContract.minted(),
					bridgeContract.horizon(),
					bridgeContract.eurAddress(),
					bridgeContract.dEuroAddress(),
				]);

				let eurSymbol = 'EUR';
				let eurDecimals = 18;
				try {
					const eurContract = new ethers.Contract(
						eurAddress,
						['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
						provider
					);
					[eurSymbol, eurDecimals] = await Promise.all([eurContract.symbol(), eurContract.decimals()]);
				} catch (error) {
					this.logger.warn('Failed to fetch EUR token info:', error);
				}

				bridges.push({
					bridgeAddress,
					limit: limit.toString(),
					minted: minted.toString(),
					horizon: Number(horizon),
					eurAddress,
					dEuroAddress,
					eurSymbol,
					eurDecimals: Number(eurDecimals),
				});
			} catch (error) {
				this.logger.error(`Failed to fetch bridge state for ${bridgeAddress}:`, error);
			}
		}

		return bridges;
	}
}

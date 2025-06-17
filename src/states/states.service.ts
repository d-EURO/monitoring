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
			equityAddress,
			minApplicationPeriod,
			minApplicationFee,
		] = await Promise.all([
			contract.name(),
			contract.symbol(),
			contract.decimals(),
			contract.totalSupply(),
			contract.reserveBalance(),
			contract.minterReserve(),
			contract.equity(),
			contract.equityAddress(),
			contract.minApplicationPeriod(),
			contract.minApplicationFee(),
		]);

		return {
			name,
			symbol,
			decimals: Number(decimals),
			totalSupply: totalSupply.toString(),
			reserveBalance: reserveBalance.toString(),
			minterReserve: minterReserve.toString(),
			equity: equity.toString(),
			equityAddress,
			minApplicationPeriod: minApplicationPeriod.toString(),
			minApplicationFee: minApplicationFee.toString(),
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

	private async persistSystemState(systemState: SystemStateData): Promise<void> {
		this.logger.log('Persisting system state to database...');

		try {
			const currentBlock = await this.blockchainService.getProvider().getBlockNumber();
			const timestamp = new Date();

			await this.databaseService.withTransaction(async (client) => {
				// Persist dEURO state
				if (systemState.deuroState) {
					await this.persistDeuroState(client, currentBlock, timestamp, systemState.deuroState);
				}

				// Persist equity state
				if (systemState.equityState) {
					await this.persistEquityState(client, currentBlock, timestamp, systemState.equityState);
				}

				// Persist DEPS state
				if (systemState.depsState) {
					await this.persistDepsState(client, currentBlock, timestamp, systemState.depsState);
				}

				// Persist savings state
				if (systemState.savingsState) {
					await this.persistSavingsState(client, currentBlock, timestamp, systemState.savingsState);
				}

				// Persist frontend state
				if (systemState.frontendState) {
					await this.persistFrontendState(client, currentBlock, timestamp, systemState.frontendState);
				}

				// Persist minting hub state
				if (systemState.mintingHubState) {
					await this.persistMintingHubState(client, currentBlock, timestamp, systemState.mintingHubState);
				}

				// Persist individual position states
				if (systemState.positionsState && systemState.positionsState.length > 0) {
					await this.persistPositionStates(client, currentBlock, timestamp, systemState.positionsState);
				}

				// Persist challenge states
				if (systemState.challengesState && systemState.challengesState.length > 0) {
					await this.persistChallengeStates(client, currentBlock, timestamp, systemState.challengesState);
				}

				// Persist collateral states
				if (systemState.collateralState && systemState.collateralState.length > 0) {
					await this.persistCollateralStates(client, currentBlock, timestamp, systemState.collateralState);
				}

				// Persist bridge states
				if (systemState.bridgeStates && systemState.bridgeStates.length > 0) {
					await this.persistBridgeStates(client, currentBlock, timestamp, systemState.bridgeStates);
				}
			});

			this.logger.log('System state persisted successfully');
		} catch (error) {
			this.logger.error('Failed to persist system state:', error);
			throw error;
		}
	}

	private async persistDeuroState(client: any, blockNumber: number, timestamp: Date, state: any): Promise<void> {
		const query = `
			INSERT INTO deuro_states (block_number, timestamp, total_supply, minter_reserve, equity)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (block_number) DO UPDATE SET
				timestamp = EXCLUDED.timestamp,
				total_supply = EXCLUDED.total_supply,
				minter_reserve = EXCLUDED.minter_reserve,
				equity = EXCLUDED.equity
		`;
		await client.query(query, [blockNumber, timestamp, state.totalSupply, state.minterReserve, state.equity]);
	}

	private async persistEquityState(client: any, blockNumber: number, timestamp: Date, state: any): Promise<void> {
		const query = `
			INSERT INTO equity_states (block_number, timestamp, total_shares, total_votes, market_cap, price)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (block_number) DO UPDATE SET
				timestamp = EXCLUDED.timestamp,
				total_shares = EXCLUDED.total_shares,
				total_votes = EXCLUDED.total_votes,
				market_cap = EXCLUDED.market_cap,
				price = EXCLUDED.price
		`;
		const marketCap = BigInt(state.totalSupply) * BigInt(state.price);
		await client.query(query, [blockNumber, timestamp, state.totalSupply, state.totalVotes, marketCap.toString(), state.price]);
	}

	private async persistDepsState(client: any, blockNumber: number, timestamp: Date, state: any): Promise<void> {
		const query = `
			INSERT INTO deps_states (block_number, timestamp, total_wrapped, wrapper_balance)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (block_number) DO UPDATE SET
				timestamp = EXCLUDED.timestamp,
				total_wrapped = EXCLUDED.total_wrapped,
				wrapper_balance = EXCLUDED.wrapper_balance
		`;
		await client.query(query, [blockNumber, timestamp, state.totalSupply, state.totalSupply]);
	}

	private async persistSavingsState(client: any, blockNumber: number, timestamp: Date, state: any): Promise<void> {
		const query = `
			INSERT INTO savings_states (block_number, timestamp, total_savings, current_rate, savings_cap)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (block_number) DO UPDATE SET
				timestamp = EXCLUDED.timestamp,
				total_savings = EXCLUDED.total_savings,
				current_rate = EXCLUDED.current_rate,
				savings_cap = EXCLUDED.savings_cap
		`;
		const savingsCap = '0'; // Default cap, would need to be fetched from contract if available
		await client.query(query, [blockNumber, timestamp, state.totalSavings, state.currentRatePPM.toString(), savingsCap]);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private async persistFrontendState(client: any, blockNumber: number, timestamp: Date, _state: any): Promise<void> {
		const query = `
			INSERT INTO frontend_states (block_number, timestamp, total_fees_collected, active_frontends)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (block_number) DO UPDATE SET
				timestamp = EXCLUDED.timestamp,
				total_fees_collected = EXCLUDED.total_fees_collected,
				active_frontends = EXCLUDED.active_frontends
		`;
		const totalFeesCollected = '0'; // Would need to be calculated/fetched
		const activeFrontends = 1; // Default value
		await client.query(query, [blockNumber, timestamp, totalFeesCollected, activeFrontends]);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private async persistMintingHubState(client: any, blockNumber: number, timestamp: Date, _state: any): Promise<void> {
		const query = `
			INSERT INTO minting_hub_states (block_number, timestamp, total_positions, total_collateral, total_minted)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (block_number) DO UPDATE SET
				timestamp = EXCLUDED.timestamp,
				total_positions = EXCLUDED.total_positions,
				total_collateral = EXCLUDED.total_collateral,
				total_minted = EXCLUDED.total_minted
		`;
		// These would need to be calculated from position data
		const totalPositions = 0;
		const totalCollateral = '0';
		const totalMinted = '0';
		await client.query(query, [blockNumber, timestamp, totalPositions, totalCollateral, totalMinted]);
	}

	private async persistPositionStates(client: any, blockNumber: number, timestamp: Date, positions: any[]): Promise<void> {
		for (const position of positions) {
			const query = `
				INSERT INTO position_states (
					block_number, timestamp, position_address, owner_address, collateral_address,
					collateral_balance, minted_amount, limit_for_position, limit_for_clones,
					available_for_position, available_for_clones, is_original, is_clone, is_closed
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
				ON CONFLICT (block_number, position_address) DO UPDATE SET
					timestamp = EXCLUDED.timestamp,
					owner_address = EXCLUDED.owner_address,
					collateral_address = EXCLUDED.collateral_address,
					collateral_balance = EXCLUDED.collateral_balance,
					minted_amount = EXCLUDED.minted_amount,
					limit_for_position = EXCLUDED.limit_for_position,
					limit_for_clones = EXCLUDED.limit_for_clones,
					available_for_position = EXCLUDED.available_for_position,
					available_for_clones = EXCLUDED.available_for_clones,
					is_original = EXCLUDED.is_original,
					is_clone = EXCLUDED.is_clone,
					is_closed = EXCLUDED.is_closed
			`;

			const isOriginal = position.positionAddress === position.original;
			const isClone = !isOriginal;

			await client.query(query, [
				blockNumber,
				timestamp,
				position.positionAddress,
				position.owner,
				position.collateralAddress,
				position.collateralBalance,
				position.debt,
				position.limit,
				'0', // limit_for_clones
				position.limit,
				'0', // available amounts (would need calculation)
				isOriginal,
				isClone,
				position.isClosed,
			]);
		}
	}

	private async persistChallengeStates(client: any, blockNumber: number, timestamp: Date, challenges: any[]): Promise<void> {
		for (const challenge of challenges) {
			const query = `
				INSERT INTO challenge_states (
					block_number, timestamp, challenge_number, position_address, challenger_address,
					bid_amount, challenge_size, is_active
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT (block_number, challenge_number) DO UPDATE SET
					timestamp = EXCLUDED.timestamp,
					position_address = EXCLUDED.position_address,
					challenger_address = EXCLUDED.challenger_address,
					bid_amount = EXCLUDED.bid_amount,
					challenge_size = EXCLUDED.challenge_size,
					is_active = EXCLUDED.is_active
			`;

			const isActive = challenge.phase > 0; // Active if phase > 0

			await client.query(query, [
				blockNumber,
				timestamp,
				challenge.challengeId,
				challenge.position,
				challenge.challenger,
				challenge.currentPrice,
				challenge.size,
				isActive,
			]);
		}
	}

	private async persistCollateralStates(client: any, blockNumber: number, timestamp: Date, collaterals: any[]): Promise<void> {
		for (const collateral of collaterals) {
			const query = `
				INSERT INTO collateral_states (
					block_number, timestamp, token_address, symbol, decimals, total_collateral, position_count
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (block_number, token_address) DO UPDATE SET
					timestamp = EXCLUDED.timestamp,
					symbol = EXCLUDED.symbol,
					decimals = EXCLUDED.decimals,
					total_collateral = EXCLUDED.total_collateral,
					position_count = EXCLUDED.position_count
			`;

			// These would need to be calculated from position data
			const totalCollateral = '0';
			const positionCount = 0;

			await client.query(query, [
				blockNumber,
				timestamp,
				collateral.address,
				collateral.symbol,
				collateral.decimals,
				totalCollateral,
				positionCount,
			]);
		}
	}

	private async persistBridgeStates(client: any, blockNumber: number, timestamp: Date, bridges: any[]): Promise<void> {
		for (const bridge of bridges) {
			const query = `
				INSERT INTO bridge_states (
					block_number, timestamp, bridge_address, target_chain_id, total_bridged, is_active
				)
				VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (block_number, bridge_address) DO UPDATE SET
					timestamp = EXCLUDED.timestamp,
					target_chain_id = EXCLUDED.target_chain_id,
					total_bridged = EXCLUDED.total_bridged,
					is_active = EXCLUDED.is_active
			`;

			const targetChainId = 1; // Would need to be determined from bridge contract
			const isActive = true; // Would need to be determined from bridge state

			await client.query(query, [blockNumber, timestamp, bridge.bridgeAddress, targetChainId, bridge.minted, isActive]);
		}
	}

	// API Methods for frontend
	async getCurrentDeuroState() {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		const contractState = await this.getDecentralizedEuroState(contracts.deuroContract);

		return {
			...contractState,
			address: await contracts.deuroContract.getAddress(),
			block_number: currentBlock,
			timestamp: new Date(),
		};
	}

	async getCurrentEquityState() {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		const contractState = await this.getEquityState(contracts.equityContract);

		return {
			...contractState,
			address: await contracts.equityContract.getAddress(),
			minHoldingDuration: contractState.minHoldingDuration.toString(),
			block_number: currentBlock,
			timestamp: new Date(),
		};
	}

	async getCurrentPositionsState() {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		const activePositionAddresses: string[] = await this.databaseService.getActivePositionAddresses();
		const positionEvents: any[] = []; // Would need to get from events if needed

		const positions = await this.getPositionsState(contracts.mintingHubContract, activePositionAddresses, positionEvents);

		return positions.map((position) => ({
			...position,
			address: position.positionAddress,
			expiredPurchasePrice: '0', // Would need to calculate or fetch
			riskPremiumPPM: 0, // Would need to fetch from position contract
			reserveContribution: 0, // Would need to fetch from position contract
			fixedAnnualRatePPM: 0, // Would need to fetch from position contract
			block_number: currentBlock,
			timestamp: new Date(),
		}));
	}

	async getDailyStateHistory(stateType: string, days: number = 30) {
		const tableName = `${stateType}_states`;
		const query = `
      SELECT * FROM ${tableName} 
      WHERE timestamp >= NOW() - INTERVAL '${days} days'
      ORDER BY timestamp DESC
    `;

		return this.databaseService.fetch(query);
	}

	async getCurrentDepsState() {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		const contractState = await this.getDepsWrapperState(contracts.depsContract);

		return {
			...contractState,
			address: await contracts.depsContract.getAddress(),
			block_number: currentBlock,
			timestamp: new Date(),
		};
	}

	async getCurrentSavingsState() {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		const contractState = await this.getSavingsGatewayState(contracts.savingsContract, contracts.deuroContract);

		return {
			...contractState,
			address: await contracts.savingsContract.getAddress(),
			currentRatePPM: contractState.currentRatePPM.toString(),
			nextRatePPM: contractState.nextRatePPM.toString(),
			nextChange: contractState.nextChange.toString(),
			currentTicks: contractState.currentTicks.toString(),
			block_number: currentBlock,
			timestamp: new Date(),
		};
	}

	async getCurrentFrontendState() {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		const contractState = await this.getFrontendGatewayState(contracts.frontendGatewayContract);

		return {
			...contractState,
			address: await contracts.frontendGatewayContract.getAddress(),
			changeTimeLock: contractState.changeTimeLock.toString(),
			block_number: currentBlock,
			timestamp: new Date(),
		};
	}

	async getCurrentMintingHubState() {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		const contractState = await this.getMintingHubState(contracts.mintingHubContract);

		return {
			...contractState,
			openingFee: contractState.openingFee,
			challengerReward: contractState.challengerReward,
			rate: contractState.rate,
			block_number: currentBlock,
			timestamp: new Date(),
		};
	}

	async getActiveChallenges() {
		const contracts = this.blockchainService.getContracts();
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		const challenges = await this.getChallengesState(contracts.mintingHubContract);

		return challenges
			.filter((challenge) => challenge.phase > 0) // Only active challenges
			.map((challenge) => ({
				...challenge,
				id: challenge.challengeId,
				block_number: currentBlock,
				timestamp: new Date(),
			}));
	}

	async getCurrentCollateralStates() {
		const provider = this.blockchainService.getProvider();
		const currentBlock = await provider.getBlockNumber();

		// Get position events to identify collateral types - for now use empty array
		const positionEvents: any[] = [];

		const collaterals = await this.getCollateralState(positionEvents, provider);

		return collaterals.map((collateral) => ({
			...collateral,
			block_number: currentBlock,
			timestamp: new Date(),
		}));
	}

	async getCurrentBridgeStates() {
		const provider = this.blockchainService.getProvider();
		const blockchainId = this.blockchainService.getBlockchainId();
		const currentBlock = await provider.getBlockNumber();

		const bridgeStates = await this.getStablecoinBridgesStates(provider, blockchainId);

		return bridgeStates.map((bridge) => ({
			...bridge,
			address: bridge.bridgeAddress,
			limit: bridge.limit,
			minted: bridge.minted,
			horizon: bridge.horizon.toString(),
			bridgeType: this.getBridgeTypeFromSymbol(bridge.eurSymbol),
			block_number: currentBlock,
			timestamp: new Date(),
		}));
	}

	private getBridgeTypeFromSymbol(symbol: string): any {
		const symbolToBridge: { [key: string]: any } = {
			EURT: 'bridgeEURT',
			EURS: 'bridgeEURS',
			VEUR: 'bridgeVEUR',
			EURC: 'bridgeEURC',
			EURR: 'bridgeEURR',
			EUROP: 'bridgeEUROP',
			EURI: 'bridgeEURI',
			EURE: 'bridgeEURE',
		};
		return symbolToBridge[symbol] || 'bridgeEURT';
	}

	private async getPositionsState(
		_mintingHub: ethers.Contract,
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

import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DatabaseService } from '../database/database.service';
import { ProviderService } from '../blockchain/provider.service';
import { ContractService } from '../monitoringV2/contract.service';
import { MulticallService } from '../common/services/multicall.service';
import { PriceService } from '../common/services/price.service';
import { ERC20ABI, PositionV2ABI, StablecoinBridgeABI } from '@deuro/eurocoin';
import { ContractType } from './monitoring.dto';

interface PositionState {
	address: string;
	status: string;
	owner: string;
	original: string;
	collateral: string;
	collateralBalance: bigint;
	price: bigint;
	virtualPrice: bigint;
	expiredPurchasePrice: bigint;
	collateralRequirement: bigint;
	debt: bigint;
	interest: bigint;
	minimumCollateral: bigint;
	minimumChallengeAmount: bigint;
	limitAmount: bigint;
	principal: bigint;
	riskPremiumPPM: number;
	reserveContribution: number;
	fixedAnnualRatePPM: number;
	lastAccrual: bigint;
	startTimestamp: bigint;
	cooldownPeriod: bigint;
	expirationTimestamp: bigint;
	challengedAmount: bigint;
	challengePeriod: bigint;
	isClosed: boolean;
	availableForMinting: bigint;
	availableForClones: bigint;
	created: number;
	marketPrice: bigint;
	collateralizationRatio: number;
	frontendCode?: string;
}

interface ChallengeState {
	id: number;
	challenger: string;
	position: string;
	positionOwner: string;
	startTimestamp: bigint;
	initialSize: bigint;
	size: bigint;
	collateral: string;
	liqPrice: bigint;
	phase: number;
	status: string;
	currentPrice: bigint;
}

interface CollateralState {
	address: string;
	symbol: string;
	decimals: number;
	totalCollateral: bigint;
	positionCount: number;
	totalLimit: bigint;
	totalAvailableForMinting: bigint;
	price: number;
}

interface MinterState {
	address: string;
	type: 'REGULAR' | 'BRIDGE';
	status: string;
	applicationDate?: Date;
	applicationPeriod?: bigint;
	applicationFee?: bigint;
	message?: string;
	denialDate?: Date;
	denialMessage?: string;
	// Bridge-specific
	bridgeTokenAddress?: string;
	bridgeTokenSymbol?: string;
	bridgeTokenDecimals?: number;
	bridgeHorizon?: bigint;
	bridgeLimit?: bigint;
	bridgeMinted?: bigint;
}

interface SystemState {
	deuroTotalSupply: bigint;
	depsTotalSupply: bigint;
	equityShares: bigint;
	equityPrice: bigint;
	reserveTotal: bigint;
	reserveMinter: bigint;
	reserveEquity: bigint;
	savingsTotal: bigint;
	savingsInterestCollected: bigint;
	savingsRate: bigint;
	deuroLoss: bigint;
	deuroProfit: bigint;
	deuroProfitDistributed: bigint;
	frontendFeesCollected: bigint;
	frontendsActive: number;
	usdToEurRate: number;
	usdToChfRate: number;
}

@Injectable()
export class StateUpdaterService {
	private readonly logger = new Logger(StateUpdaterService.name);

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly providerService: ProviderService,
		private readonly coreContracts: ContractService,
		private readonly contractRegistry: ContractService,
		private readonly multicallService: MulticallService,
		private readonly priceService: PriceService
	) {}

	/**
	 * Update all states at a given block
	 */
	async updateStates(blockNumber: number): Promise<void> {
		const provider = this.providerService.provider;
		const block = await provider.getBlock(blockNumber);
		const timestamp = new Date(block.timestamp * 1000);

		this.logger.log(`Updating states at block ${blockNumber}`);
		const positionStates = await this.fetchPositionStates(blockNumber);
		const [challengeStates, collateralStates, minterStates, systemState] = await Promise.all([
			this.fetchChallengeStates(blockNumber),
			this.fetchCollateralStates(positionStates, blockNumber),
			this.fetchMinterStates(blockNumber),
			this.fetchSystemState(blockNumber),
		]);

		// Persist all states in a transaction
		await this.databaseService.withTransaction(async (client) => {
			await this.persistPositionStates(client, positionStates, blockNumber, timestamp);
			await this.persistChallengeStates(client, challengeStates, blockNumber, timestamp);
			await this.persistCollateralStates(client, collateralStates, blockNumber, timestamp);
			await this.persistMinterStates(client, minterStates, blockNumber, timestamp);
			await this.persistSystemState(client, systemState, blockNumber, timestamp);
		});

		this.logger.log('State update complete');
	}

	/**
	 * Fetch position states from all position contracts
	 */
	private async fetchPositionStates(blockNumber: number): Promise<PositionState[]> {
		const positions = await this.contractRegistry.getContractsByType(ContractType.POSITION);
		const provider = this.providerService.provider;
		const positionABI = new ethers.Interface(PositionV2ABI);

		const states: PositionState[] = [];

		const callPromises = [];
		const multicallProvider = this.multicallService.getMulticallProvider(provider);
		for (const position of positions) {
			const contract = new ethers.Contract(position.address, positionABI, multicallProvider);
			const collateralContract = new ethers.Contract(position.metadata?.collateral, ERC20ABI, multicallProvider);

			callPromises.push(
				contract.owner({ blockTag: blockNumber }),
				contract.original({ blockTag: blockNumber }),
				contract.collateral({ blockTag: blockNumber }),
				collateralContract.balanceOf(position.address, { blockTag: blockNumber }),
				contract.price({ blockTag: blockNumber }),
				contract.virtualPrice({ blockTag: blockNumber }),
				contract.principal({ blockTag: blockNumber }),
				contract.getDebt({ blockTag: blockNumber }),
				contract.interest({ blockTag: blockNumber }),
				contract.minimumCollateral({ blockTag: blockNumber }),
				contract.limit({ blockTag: blockNumber }),
				contract.riskPremiumPPM({ blockTag: blockNumber }),
				contract.reserveContribution({ blockTag: blockNumber }),
				contract.fixedAnnualRatePPM({ blockTag: blockNumber }),
				contract.start({ blockTag: blockNumber }),
				contract.cooldown({ blockTag: blockNumber }),
				contract.expiration({ blockTag: blockNumber }),
				contract.challengePeriod({ blockTag: blockNumber }),
				contract.isClosed({ blockTag: blockNumber }),
				contract.availableForMinting({ blockTag: blockNumber }),
				contract.availableForClones({ blockTag: blockNumber })
			);
		}

		if (callPromises.length === 0) return states;

		const results = await this.multicallService.executeBatch(callPromises);

		const callsPerPosition = 21;
		for (let i = 0; i < positions.length; i++) {
			const baseIndex = i * callsPerPosition;
			const position = positions[i];

			try {
				const state: PositionState = {
					address: position.address,
					owner: results[baseIndex],
					original: results[baseIndex + 1],
					collateral: results[baseIndex + 2],
					collateralBalance: results[baseIndex + 3],
					price: results[baseIndex + 4],
					virtualPrice: results[baseIndex + 5],
					principal: results[baseIndex + 6],
					debt: results[baseIndex + 7],
					interest: results[baseIndex + 8],
					minimumCollateral: results[baseIndex + 9],
					limitAmount: results[baseIndex + 10],
					riskPremiumPPM: Number(results[baseIndex + 11]),
					reserveContribution: Number(results[baseIndex + 12]),
					fixedAnnualRatePPM: Number(results[baseIndex + 13]),
					startTimestamp: results[baseIndex + 14],
					cooldownPeriod: results[baseIndex + 15],
					expirationTimestamp: results[baseIndex + 16],
					challengePeriod: results[baseIndex + 17],
					isClosed: results[baseIndex + 18],
					availableForMinting: results[baseIndex + 19],
					availableForClones: results[baseIndex + 20],
					minimumChallengeAmount: 0n, // Need to calculate or fetch separately

					// Calculate derived fields
					expiredPurchasePrice: 0n, // Would need additional logic
					collateralRequirement: 0n, // Would need additional logic
					challengedAmount: 0n, // Would need to check challenges
					lastAccrual: 0n,
					created: position.createdAtBlock,
					marketPrice: 0n, // Would need price oracle
					collateralizationRatio: 0,
					status: 'ACTIVE', // Will update based on conditions
					frontendCode: position.metadata?.frontendCode,
				};

				// Determine status
				if (state.isClosed) {
					state.status = 'CLOSED';
				} else if (state.challengedAmount > 0n) {
					state.status = 'CHALLENGED';
				} else if (Date.now() / 1000 > Number(state.expirationTimestamp)) {
					state.status = 'EXPIRED';
				}

				// Calculate collateralization ratio
				if (state.debt > 0n) {
					const collateralValue = (state.collateralBalance * state.price) / 10n ** 36n;
					state.collateralizationRatio = Number((collateralValue * 10000n) / state.debt) / 100;
				}

				states.push(state);
			} catch (error) {
				this.logger.error(`Error fetching state for position ${position.address}:`, error);
			}
		}

		return states;
	}

	/**
	 * Fetch challenge states from MintingHub
	 */
	private async fetchChallengeStates(blockNumber: number): Promise<ChallengeState[]> {
		const mintingHub = this.coreContracts.getContractsByType(ContractType.MINTING_HUB)[0];
		const states: ChallengeState[] = [];

		// Get known challenge IDs from database (from ChallengeStarted events)
		const knownChallenges = await this.databaseService.query(
			`
			SELECT DISTINCT challenge_id 
			FROM challenge_states 
			WHERE status NOT IN ('SUCCEEDED', 'AVERTED')
			ORDER BY challenge_id
			`
		);

		if (knownChallenges.rows.length === 0) {
			return states;
		}

		// Fetch current state for each known challenge
		for (const row of knownChallenges.rows) {
			const challengeId = row.challenge_id;

			try {
				const challenge = await mintingHub.challenges(challengeId, { blockTag: blockNumber });

				// Skip if challenge doesn't exist or has been cleared
				if (challenge.challenger === ethers.ZeroAddress) {
					// Mark as ended in database
					await this.databaseService.query(`UPDATE challenge_states SET status = 'ENDED' WHERE challenge_id = $1`, [challengeId]);
					continue;
				}

				// Skip if no position set
				if (challenge.position === ethers.ZeroAddress) continue;

				// Get phase for the position
				const phase = await mintingHub.phase(challenge.position, { blockTag: blockNumber });

				// Determine status based on phase
				let status = 'ACTIVE';
				if (Number(phase) === 2) {
					status = 'ENDED';
				} else if (Number(phase) === 1) {
					status = 'AVERT';
				} else {
					status = 'BID';
				}

				// Get current price if in auction phase
				let currentPrice = challenge.liqPrice;
				if (status === 'BID') {
					try {
						currentPrice = await mintingHub.price(challengeId, { blockTag: blockNumber });
					} catch (e) {
						// price() might fail if not in auction phase
					}
				}

				states.push({
					id: challengeId,
					challenger: challenge.challenger,
					position: challenge.position,
					positionOwner: challenge.positionOwner || '',
					startTimestamp: challenge.start,
					initialSize: challenge.initialSize,
					size: challenge.size,
					collateral: challenge.collateral,
					liqPrice: challenge.liqPrice,
					phase: Number(phase),
					status,
					currentPrice,
				});
			} catch (error) {
				this.logger.error(`Error fetching challenge ${challengeId}:`, error);
			}
		}

		return states;
	}

	/**
	 * Fetch collateral states (aggregated from positions)
	 */
	private async fetchCollateralStates(positions: PositionState[], blockNumber: number): Promise<CollateralState[]> {
		const collateralMap = new Map<string, CollateralState>();
		const provider = this.providerService.provider;

		// Aggregate by collateral token
		for (const position of positions) {
			if (!collateralMap.has(position.collateral)) {
				// Fetch token metadata
				const tokenContract = new ethers.Contract(position.collateral, ERC20ABI, provider);

				try {
					const [symbol, decimals] = await Promise.all([
						tokenContract.symbol({ blockTag: blockNumber }),
						tokenContract.decimals({ blockTag: blockNumber }),
					]);

					collateralMap.set(position.collateral, {
						address: position.collateral,
						symbol,
						decimals: Number(decimals),
						totalCollateral: 0n,
						positionCount: 0,
						totalLimit: 0n,
						totalAvailableForMinting: 0n,
						price: 0,
					});
				} catch (error) {
					this.logger.error(`Error fetching token metadata for ${position.collateral}:`, error);
				}
			}

			const state = collateralMap.get(position.collateral);
			if (state && !position.isClosed) {
				state.totalCollateral += position.collateralBalance;
				state.positionCount++;
				state.totalLimit += position.limitAmount;
				state.totalAvailableForMinting += position.availableForMinting;
			}
		}

		// Fetch prices for each collateral
		for (const state of collateralMap.values()) {
			try {
				// Get token prices in EUR
				const prices = await this.priceService.getTokenPricesInEur([state.address]);
				state.price = parseFloat(prices[state.address] || '0');
			} catch (error) {
				this.logger.error(`Error fetching price for ${state.symbol}:`, error);
			}
		}

		return Array.from(collateralMap.values());
	}

	/**
	 * Fetch minter and bridge states
	 */
	private async fetchMinterStates(blockNumber: number): Promise<MinterState[]> {
		const states: MinterState[] = [];

		// Fetch regular minters
		const minters = await this.contractRegistry.getContractsByType(ContractType.MINTER);
		for (const minter of minters) {
			// Check minter status from DEURO contract
			const deuroContract = this.coreContracts.getContractsByType(ContractType.DEURO)[0];
			const isMinter = await deuroContract.isMinter(minter.address, { blockTag: blockNumber });

			states.push({
				address: minter.address,
				type: 'REGULAR',
				status: isMinter ? 'APPROVED' : 'PENDING',
				applicationDate: new Date(minter.createdAtBlock * 1000),
				applicationPeriod: BigInt(minter.metadata?.applicationPeriod || 0),
				applicationFee: BigInt(minter.metadata?.applicationFee || 0),
				message: minter.metadata?.message,
			});
		}

		// Fetch bridges
		const bridges = await this.contractRegistry.getContractsByType(ContractType.BRIDGE);
		const bridgeABI = new ethers.Interface(StablecoinBridgeABI);
		const provider = this.providerService.provider;

		for (const bridge of bridges) {
			try {
				const bridgeContract = new ethers.Contract(bridge.address, bridgeABI, provider);
				const [token, horizon, limit, minted] = await Promise.all([
					bridgeContract.eur({ blockTag: blockNumber }),
					bridgeContract.horizon({ blockTag: blockNumber }),
					bridgeContract.limit({ blockTag: blockNumber }),
					bridgeContract.minted({ blockTag: blockNumber }),
				]);

				// Get token metadata
				const tokenContract = new ethers.Contract(token, ERC20ABI, provider);
				const [symbol, decimals] = await Promise.all([
					tokenContract.symbol({ blockTag: blockNumber }),
					tokenContract.decimals({ blockTag: blockNumber }),
				]);

				states.push({
					address: bridge.address,
					type: 'BRIDGE',
					status: 'APPROVED',
					bridgeTokenAddress: token,
					bridgeTokenSymbol: symbol,
					bridgeTokenDecimals: Number(decimals),
					bridgeHorizon: horizon,
					bridgeLimit: limit,
					bridgeMinted: minted,
				});
			} catch (error) {
				this.logger.error(`Error fetching bridge state for ${bridge.address}:`, error);
			}
		}

		return states;
	}

	/**
	 * Fetch system-wide state
	 */
	private async fetchSystemState(blockNumber: number): Promise<SystemState> {
		const deuroContract = this.coreContracts.getContractsByType(ContractType.DEURO)[0];
		const depsContract = this.coreContracts.getContractsByType(ContractType.DEPS)[0];
		const equityContract = this.coreContracts.getContractsByType(ContractType.EQUITY)[0];
		const savingsContract = this.coreContracts.getContractsByType(ContractType.SAVINGS)[0];

		const [deuroTotalSupply, depsTotalSupply, equityShares, equityPrice, reserveTotal, savingsTotal, savingsRate] = await Promise.all([
			deuroContract.totalSupply({ blockTag: blockNumber }),
			depsContract.totalSupply({ blockTag: blockNumber }),
			equityContract.totalSupply({ blockTag: blockNumber }),
			equityContract.price({ blockTag: blockNumber }),
			equityContract.equity({ blockTag: blockNumber }),
			savingsContract.totalSaved({ blockTag: blockNumber }),
			savingsContract.currentRatePPM({ blockTag: blockNumber }),
		]);

		// Get currency rates
		const [usdToEurRate, usdToChfRate] = await Promise.all([
			this.priceService.getExchangeRate('USD', 'EUR'),
			this.priceService.getExchangeRate('USD', 'CHF'),
		]);

		// Calculate metrics from events
		const metricsResult = await this.databaseService.query(
			`
			SELECT 
				COALESCE(SUM((args->>'amount')::NUMERIC) FILTER (WHERE topic = 'Loss'), 0) as total_loss,
				COALESCE(SUM((args->>'amount')::NUMERIC) FILTER (WHERE topic = 'Profit'), 0) as total_profit,
				COALESCE(SUM((args->>'amount')::NUMERIC) FILTER (WHERE topic = 'ProfitDistributed'), 0) as profit_distributed,
				COALESCE(SUM((args->>'interest')::NUMERIC) FILTER (WHERE topic = 'InterestCollected'), 0) as interest_collected,
				COALESCE(SUM((args->>'reward')::NUMERIC) FILTER (WHERE topic LIKE '%RewardAdded'), 0) as frontend_fees,
				COUNT(DISTINCT args->>'frontendCode') FILTER (WHERE topic = 'FrontendCodeRegistered') as frontends_active
			FROM raw_events
			WHERE block_number <= $1
		`,
			[blockNumber]
		);

		const metrics = metricsResult.rows[0] || {};

		return {
			deuroTotalSupply,
			depsTotalSupply,
			equityShares,
			equityPrice,
			reserveTotal,
			reserveMinter: 0n, // Would need additional calculation
			reserveEquity: reserveTotal,
			savingsTotal,
			savingsInterestCollected: BigInt(metrics.interest_collected || 0),
			savingsRate,
			deuroLoss: BigInt(metrics.total_loss || 0),
			deuroProfit: BigInt(metrics.total_profit || 0),
			deuroProfitDistributed: BigInt(metrics.profit_distributed || 0),
			frontendFeesCollected: BigInt(metrics.frontend_fees || 0),
			frontendsActive: parseInt(metrics.frontends_active || 0),
			usdToEurRate,
			usdToChfRate,
		};
	}

	/**
	 * Persist position states to database
	 */
	private async persistPositionStates(client: any, states: PositionState[], blockNumber: number, timestamp: Date): Promise<void> {
		// Clear existing states
		await client.query('DELETE FROM position_states');

		for (const state of states) {
			await client.query(
				`
				INSERT INTO position_states (
					position_address, status, owner_address, original_address, collateral_address,
					collateral_balance, price, virtual_price, expired_purchase_price, collateral_requirement,
					debt, interest, minimum_collateral, minimum_challenge_amount, limit_amount,
					principal, risk_premium_ppm, reserve_contribution, fixed_annual_rate_ppm, last_accrual,
					start_timestamp, cooldown_period, expiration_timestamp, challenged_amount, challenge_period,
					is_closed, available_for_minting, available_for_clones, created, market_price,
					collateralization_ratio, frontend_code, block_number, timestamp
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
					$11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
					$21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
					$31, $32, $33, $34
				)
			`,
				[
					state.address,
					state.status,
					state.owner,
					state.original,
					state.collateral,
					state.collateralBalance.toString(),
					state.price.toString(),
					state.virtualPrice.toString(),
					state.expiredPurchasePrice.toString(),
					state.collateralRequirement.toString(),
					state.debt.toString(),
					state.interest.toString(),
					state.minimumCollateral.toString(),
					state.minimumChallengeAmount.toString(),
					state.limitAmount.toString(),
					state.principal.toString(),
					state.riskPremiumPPM,
					state.reserveContribution,
					state.fixedAnnualRatePPM,
					state.lastAccrual.toString(),
					state.startTimestamp.toString(),
					state.cooldownPeriod.toString(),
					state.expirationTimestamp.toString(),
					state.challengedAmount.toString(),
					state.challengePeriod.toString(),
					state.isClosed,
					state.availableForMinting.toString(),
					state.availableForClones.toString(),
					state.created,
					state.marketPrice.toString(),
					state.collateralizationRatio,
					state.frontendCode,
					blockNumber,
					timestamp,
				]
			);
		}

		this.logger.log(`Persisted ${states.length} position states`);
	}

	/**
	 * Persist challenge states to database
	 */
	private async persistChallengeStates(client: any, states: ChallengeState[], blockNumber: number, timestamp: Date): Promise<void> {
		await client.query('DELETE FROM challenge_states');

		for (const state of states) {
			await client.query(
				`
				INSERT INTO challenge_states (
					challenge_id, challenger_address, position_address, position_owner_address,
					start_timestamp, initial_size, size, collateral_address, liq_price,
					phase, status, current_price, block_number, timestamp
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
			`,
				[
					state.id,
					state.challenger,
					state.position,
					state.positionOwner,
					state.startTimestamp.toString(),
					state.initialSize.toString(),
					state.size.toString(),
					state.collateral,
					state.liqPrice.toString(),
					state.phase,
					state.status,
					state.currentPrice.toString(),
					blockNumber,
					timestamp,
				]
			);
		}

		this.logger.log(`Persisted ${states.length} challenge states`);
	}

	/**
	 * Persist collateral states to database
	 */
	private async persistCollateralStates(client: any, states: CollateralState[], blockNumber: number, timestamp: Date): Promise<void> {
		await client.query('DELETE FROM collateral_states');

		for (const state of states) {
			await client.query(
				`
				INSERT INTO collateral_states (
					token_address, symbol, decimals, total_collateral, position_count,
					total_limit, total_available_for_minting, price, block_number, timestamp
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			`,
				[
					state.address,
					state.symbol,
					state.decimals,
					state.totalCollateral.toString(),
					state.positionCount,
					state.totalLimit.toString(),
					state.totalAvailableForMinting.toString(),
					state.price,
					blockNumber,
					timestamp,
				]
			);
		}

		this.logger.log(`Persisted ${states.length} collateral states`);
	}

	/**
	 * Persist minter states to database
	 */
	private async persistMinterStates(client: any, states: MinterState[], blockNumber: number, timestamp: Date): Promise<void> {
		await client.query('DELETE FROM minter_states');

		for (const state of states) {
			await client.query(
				`
				INSERT INTO minter_states (
					minter_address, minter_type, status, application_date, application_period,
					application_fee, message, denial_date, denial_message,
					bridge_token_address, bridge_token_symbol, bridge_token_decimals,
					bridge_horizon, bridge_limit, bridge_minted,
					block_number, timestamp
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8, $9,
					$10, $11, $12, $13, $14, $15, $16, $17
				)
			`,
				[
					state.address,
					state.type,
					state.status,
					state.applicationDate,
					state.applicationPeriod?.toString(),
					state.applicationFee?.toString(),
					state.message,
					state.denialDate,
					state.denialMessage,
					state.bridgeTokenAddress,
					state.bridgeTokenSymbol,
					state.bridgeTokenDecimals,
					state.bridgeHorizon?.toString(),
					state.bridgeLimit?.toString(),
					state.bridgeMinted?.toString(),
					blockNumber,
					timestamp,
				]
			);
		}

		this.logger.log(`Persisted ${states.length} minter states`);
	}

	/**
	 * Persist system state to database
	 */
	private async persistSystemState(client: any, state: SystemState, blockNumber: number, timestamp: Date): Promise<void> {
		await client.query(
			`
			UPDATE system_state SET
				deuro_total_supply = $1,
				deps_total_supply = $2,
				equity_shares = $3,
				equity_price = $4,
				reserve_total = $5,
				reserve_minter = $6,
				reserve_equity = $7,
				savings_total = $8,
				savings_interest_collected = $9,
				savings_rate = $10,
				deuro_loss = $11,
				deuro_profit = $12,
				deuro_profit_distributed = $13,
				frontend_fees_collected = $14,
				frontends_active = $15,
				usd_to_eur_rate = $16,
				usd_to_chf_rate = $17,
				block_number = $18,
				timestamp = $19
			WHERE id = 1
		`,
			[
				state.deuroTotalSupply.toString(),
				state.depsTotalSupply.toString(),
				state.equityShares.toString(),
				state.equityPrice.toString(),
				state.reserveTotal.toString(),
				state.reserveMinter.toString(),
				state.reserveEquity.toString(),
				state.savingsTotal.toString(),
				state.savingsInterestCollected.toString(),
				state.savingsRate.toString(),
				state.deuroLoss.toString(),
				state.deuroProfit.toString(),
				state.deuroProfitDistributed.toString(),
				state.frontendFeesCollected.toString(),
				state.frontendsActive,
				state.usdToEurRate,
				state.usdToChfRate,
				blockNumber,
				timestamp,
			]
		);

		this.logger.log('Persisted system state');
	}
}

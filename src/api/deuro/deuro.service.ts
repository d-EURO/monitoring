import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DeuroStateDto } from 'src/common/dto';

@Injectable()
export class DeuroService {
	constructor(private readonly databaseService: DatabaseService) {}

	async getCurrentState(): Promise<DeuroStateDto | null> {
		// Get the base state from the system_state table
		const stateResult = await this.databaseService.query('SELECT * FROM system_state WHERE id = 1');

		if (stateResult.rows.length === 0) {
			return null;
		}

		const baseState = stateResult.rows[0];
		const now = new Date();
		const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

		// Calculate 24-hour metrics from events
		const metrics24h = await this.calculate24HourMetrics(twentyFourHoursAgo);

		return {
			deuroTotalSupply: baseState.deuro_total_supply?.toString() || '0',
			depsTotalSupply: baseState.deps_total_supply?.toString() || '0',
			equityShares: baseState.equity_shares?.toString() || '0',
			equityPrice: baseState.equity_price?.toString() || '0',
			reserveTotal: baseState.reserve_total?.toString() || '0',
			reserveMinter: baseState.reserve_minter?.toString() || '0',
			reserveEquity: baseState.reserve_equity?.toString() || '0',
			deuroVolume24h: metrics24h.deuroVolume.toString(),
			deuroTransferCount24h: metrics24h.deuroTransferCount,
			deuroUniqueAddresses24h: metrics24h.deuroUniqueAddresses,
			depsVolume24h: metrics24h.depsVolume.toString(),
			depsTransferCount24h: metrics24h.depsTransferCount,
			depsUniqueAddresses24h: metrics24h.depsUniqueAddresses,
			equityTradeVolume24h: metrics24h.equityTradeVolume.toString(),
			equityTradeCount24h: metrics24h.equityTradeCount,
			equityDelegations24h: metrics24h.equityDelegations,
			savingsAdded24h: metrics24h.savingsAdded.toString(),
			savingsWithdrawn24h: metrics24h.savingsWithdrawn.toString(),
			savingsInterestCollected24h: metrics24h.savingsInterestCollected.toString(),
			deuroLoss: baseState.deuro_loss?.toString() || '0',
			deuroProfit: baseState.deuro_profit?.toString() || '0',
			deuroProfitDistributed: baseState.deuro_profit_distributed?.toString() || '0',
			savingsTotal: baseState.savings_total?.toString() || '0',
			savingsInterestCollected: baseState.savings_interest_collected?.toString() || '0',
			savingsRate: baseState.savings_rate?.toString() || '0',
			frontendFeesCollected: baseState.frontend_fees_collected?.toString() || '0',
			frontendsActive: baseState.frontends_active || 0,
			usdToEurRate: baseState.usd_to_eur_rate || 0,
			usdToChfRate: baseState.usd_to_chf_rate || 0,
			deuroMinted24h: metrics24h.deuroMinted.toString(),
			deuroBurned24h: metrics24h.deuroBurned.toString(),
		};
	}

	private async calculate24HourMetrics(since: Date) {
		// Get DEURO Transfer events
		const deuroTransfersResult = await this.databaseService.query(
			`SELECT 
				COUNT(*) as count,
				COUNT(DISTINCT event_data->>'from') + COUNT(DISTINCT event_data->>'to') as unique_addresses,
				COALESCE(SUM((event_data->>'amount')::NUMERIC), 0) as volume
			FROM raw_events 
			WHERE event_name = 'Transfer' 
				AND contract_address = (SELECT contract_address FROM contracts WHERE contract_type = 'DEURO' LIMIT 1)
				AND timestamp >= $1`,
			[since]
		);

		// Get DEPS Transfer events
		const depsTransfersResult = await this.databaseService.query(
			`SELECT 
				COUNT(*) as count,
				COUNT(DISTINCT event_data->>'from') + COUNT(DISTINCT event_data->>'to') as unique_addresses,
				COALESCE(SUM((event_data->>'amount')::NUMERIC), 0) as volume
			FROM raw_events 
			WHERE event_name = 'Transfer' 
				AND contract_address = (SELECT contract_address FROM contracts WHERE contract_type = 'DEPS' LIMIT 1)
				AND timestamp >= $1`,
			[since]
		);

		// Get Equity trade events (Trade events from Equity contract)
		const equityTradesResult = await this.databaseService.query(
			`SELECT 
				COUNT(*) as count,
				COALESCE(SUM((event_data->>'amount')::NUMERIC), 0) as volume
			FROM raw_events 
			WHERE event_name = 'Trade' 
				AND contract_address = (SELECT contract_address FROM contracts WHERE contract_type = 'EQUITY' LIMIT 1)
				AND timestamp >= $1`,
			[since]
		);

		// Get Delegation events
		const delegationsResult = await this.databaseService.query(
			`SELECT COUNT(*) as count
			FROM raw_events 
			WHERE event_name IN ('Delegation', 'Undelegation')
				AND contract_address = (SELECT contract_address FROM contracts WHERE contract_type = 'EQUITY' LIMIT 1)
				AND timestamp >= $1`,
			[since]
		);

		// Get Savings events
		const savingsResult = await this.databaseService.query(
			`SELECT 
				COALESCE(SUM(CASE WHEN event_name = 'SavingsDeposited' THEN (event_data->>'amount')::NUMERIC ELSE 0 END), 0) as added,
				COALESCE(SUM(CASE WHEN event_name = 'SavingsWithdrawn' THEN (event_data->>'amount')::NUMERIC ELSE 0 END), 0) as withdrawn,
				COALESCE(SUM(CASE WHEN event_name = 'InterestCollected' THEN (event_data->>'amount')::NUMERIC ELSE 0 END), 0) as interest_collected
			FROM raw_events 
			WHERE event_name IN ('SavingsDeposited', 'SavingsWithdrawn', 'InterestCollected')
				AND contract_address = (SELECT contract_address FROM contracts WHERE contract_type = 'SAVINGS' LIMIT 1)
				AND timestamp >= $1`,
			[since]
		);

		// Get minting and burning events
		const mintBurnResult = await this.databaseService.query(
			`SELECT 
				COALESCE(SUM(CASE WHEN event_name IN ('PositionOpened', 'MintingUpdate') THEN (event_data->>'deuro')::NUMERIC ELSE 0 END), 0) as minted,
				COALESCE(SUM(CASE WHEN event_name IN ('PositionClosed', 'PositionDenied') THEN (event_data->>'deuro')::NUMERIC ELSE 0 END), 0) as burned
			FROM raw_events 
			WHERE event_name IN ('PositionOpened', 'MintingUpdate', 'PositionClosed', 'PositionDenied')
				AND timestamp >= $1`,
			[since]
		);

		const deuroTransfers = deuroTransfersResult.rows[0];
		const depsTransfers = depsTransfersResult.rows[0];
		const equityTrades = equityTradesResult.rows[0];
		const delegations = delegationsResult.rows[0];
		const savings = savingsResult.rows[0];
		const mintBurn = mintBurnResult.rows[0];

		return {
			deuroVolume: BigInt(deuroTransfers?.volume || 0),
			deuroTransferCount: parseInt(deuroTransfers?.count || '0'),
			deuroUniqueAddresses: parseInt(deuroTransfers?.unique_addresses || '0'),
			depsVolume: BigInt(depsTransfers?.volume || 0),
			depsTransferCount: parseInt(depsTransfers?.count || '0'),
			depsUniqueAddresses: parseInt(depsTransfers?.unique_addresses || '0'),
			equityTradeVolume: BigInt(equityTrades?.volume || 0),
			equityTradeCount: parseInt(equityTrades?.count || '0'),
			equityDelegations: parseInt(delegations?.count || '0'),
			savingsAdded: BigInt(savings?.added || 0),
			savingsWithdrawn: BigInt(savings?.withdrawn || 0),
			savingsInterestCollected: BigInt(savings?.interest_collected || 0),
			deuroMinted: BigInt(mintBurn?.minted || 0),
			deuroBurned: BigInt(mintBurn?.burned || 0),
		};
	}
}

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CacheService } from '../common/services/cache.service';
import {
	DeuroTransferMetrics,
	DeuroMinterMetrics,
	DeuroProfitLossMetrics,
	DepsFlowMetrics,
	SavingsOverviewMetrics,
	EquityTradingMetrics,
	MintingPositionMetrics,
} from './metrics.dto';

@Injectable()
export class MetricsService {
	private readonly logger = new Logger(MetricsService.name);

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly cacheService: CacheService
	) {}

	async getDeuroTransferMetrics(): Promise<DeuroTransferMetrics> {
		const cacheKey = 'deuro:transfers';
		const cached = this.cacheService.get<DeuroTransferMetrics>(cacheKey);
		if (cached) return cached;

		const volumeQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN value::numeric ELSE 0 END), 0) as volume_24h,
        COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN value::numeric ELSE 0 END), 0) as volume_7d,
        COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN value::numeric ELSE 0 END), 0) as volume_30d,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 1 END) as tx_24h,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 1 END) as tx_7d,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN 1 END) as tx_30d
      FROM deuro_transfer_events
    `;

		const addressQuery = `
      WITH address_activity AS (
        SELECT from_address as address, timestamp FROM deuro_transfer_events
        UNION
        SELECT to_address as address, timestamp FROM deuro_transfer_events
      )
      SELECT
        COUNT(DISTINCT CASE WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN address END) as addresses_24h,
        COUNT(DISTINCT CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN address END) as addresses_7d,
        COUNT(DISTINCT CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN address END) as addresses_30d
      FROM address_activity
    `;

		const [volumeResults, addressResults] = await Promise.all([
			this.databaseService.fetch(volumeQuery),
			this.databaseService.fetch(addressQuery),
		]);

		const volumeData = volumeResults[0];
		const addressData = addressResults[0];

		const metrics: DeuroTransferMetrics = {
			volume: {
				day: volumeData.volume_24h.toString(),
				week: volumeData.volume_7d.toString(),
				month: volumeData.volume_30d.toString(),
			},
			transactions: {
				day: parseInt(volumeData.tx_24h),
				week: parseInt(volumeData.tx_7d),
				month: parseInt(volumeData.tx_30d),
			},
			activeAddresses: {
				day: parseInt(addressData.addresses_24h),
				week: parseInt(addressData.addresses_7d),
				month: parseInt(addressData.addresses_30d),
			},
			averageSize: {
				day: volumeData.tx_24h > 0 ? (parseFloat(volumeData.volume_24h) / parseInt(volumeData.tx_24h)).toFixed(2) : '0',
				week: volumeData.tx_7d > 0 ? (parseFloat(volumeData.volume_7d) / parseInt(volumeData.tx_7d)).toFixed(2) : '0',
				month: volumeData.tx_30d > 0 ? (parseFloat(volumeData.volume_30d) / parseInt(volumeData.tx_30d)).toFixed(2) : '0',
			},
		};

		this.cacheService.set(cacheKey, metrics);
		return metrics;
	}

	async getDeuroMinterMetrics(): Promise<DeuroMinterMetrics> {
		const cacheKey = 'deuro:minters';
		const cached = this.cacheService.get<DeuroMinterMetrics>(cacheKey);
		if (cached) return cached;

		const applicationsQuery = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN 1 END) as applications_30d,
        COALESCE(SUM(application_fee::numeric), 0) as total_fees,
      FROM deuro_minter_applied_events
    `;

		const denialsQuery = `
      SELECT 
        COUNT(*) as total_denials,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN 1 END) as denials_30d
      FROM deuro_minter_denied_events
    `;

		const [applicationResults, denialResults] = await Promise.all([
			this.databaseService.fetch(applicationsQuery),
			this.databaseService.fetch(denialsQuery),
		]);

		const appData = applicationResults[0];
		const denialData = denialResults[0];
		const metrics: DeuroMinterMetrics = {
			applications: {
				total: parseInt(appData.total_applications),
				month: parseInt(appData.applications_30d),
			},
			denials: {
				total: parseInt(denialData.total_denials),
				month: parseInt(denialData.denials_30d),
			},
			totalFees: appData.total_fees.toString(),
		};

		this.cacheService.set(cacheKey, metrics);
		return metrics;
	}

	async getDeuroProfitLossMetrics(): Promise<DeuroProfitLossMetrics> {
		const cacheKey = 'deuro:profit-loss';
		const cached = this.cacheService.get<DeuroProfitLossMetrics>(cacheKey);
		if (cached) return cached;

		const profitQuery = `
      SELECT 
        COALESCE(SUM(amount::numeric), 0) as total_profits,
        COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN amount::numeric ELSE 0 END), 0) as profits_30d
      FROM deuro_profit_events
    `;

		const lossQuery = `
      SELECT 
        COALESCE(SUM(amount::numeric), 0) as total_losses,
        COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN amount::numeric ELSE 0 END), 0) as losses_30d
      FROM deuro_loss_events
    `;

		const distributedQuery = `
      SELECT COALESCE(SUM(amount::numeric), 0) as total_distributed
      FROM deuro_profit_distributed_events
    `;

		const [profitResults, lossResults, distributedResults] = await Promise.all([
			this.databaseService.fetch(profitQuery),
			this.databaseService.fetch(lossQuery),
			this.databaseService.fetch(distributedQuery),
		]);

		const profitData = profitResults[0];
		const lossData = lossResults[0];
		const distributedData = distributedResults[0];

		const totalProfits = parseFloat(profitData.total_profits);
		const totalLosses = parseFloat(lossData.total_losses);
		const netProfit = totalProfits - totalLosses;
		const profitRatio = totalLosses > 0 ? (totalProfits / totalLosses).toFixed(2) : '0.00';

		const metrics: DeuroProfitLossMetrics = {
			profits: {
				total: profitData.total_profits.toString(),
				month: profitData.profits_30d.toString(),
			},
			losses: {
				total: lossData.total_losses.toString(),
				month: lossData.losses_30d.toString(),
			},
			netProfit: netProfit.toString(),
			profitRatio,
			distributed: distributedData.total_distributed.toString(),
		};

		this.cacheService.set(cacheKey, metrics);
		return metrics;
	}

	async getDepsFlowMetrics(): Promise<DepsFlowMetrics> {
		const cacheKey = 'deps:flows';
		const cached = this.cacheService.get<DepsFlowMetrics>(cacheKey);
		if (cached) return cached;

		const wrapQuery = `
      SELECT 
        COALESCE(SUM(amount::numeric), 0) as wrap_volume,
        COUNT(*) as wrap_count
      FROM deps_wrap_events
    `;

		const unwrapQuery = `
      SELECT 
        COALESCE(SUM(amount::numeric), 0) as unwrap_volume,
        COUNT(*) as unwrap_count
      FROM deps_unwrap_events
    `;

		const [wrapResults, unwrapResults] = await Promise.all([
			this.databaseService.fetch(wrapQuery),
			this.databaseService.fetch(unwrapQuery),
		]);

		const wrapData = wrapResults[0];
		const unwrapData = unwrapResults[0];
		const metrics: DepsFlowMetrics = {
			wraps: {
				volume: wrapData.wrap_volume.toString(),
				count: parseInt(wrapData.wrap_count),
			},
			unwraps: {
				volume: unwrapData.unwrap_volume.toString(),
				count: parseInt(unwrapData.unwrap_count),
			},
		};

		this.cacheService.set(cacheKey, metrics);
		return metrics;
	}

	async getSavingsOverviewMetrics(): Promise<SavingsOverviewMetrics> {
		const cacheKey = 'savings:overview';
		const cached = this.cacheService.get<SavingsOverviewMetrics>(cacheKey);
		if (cached) return cached;

		const savedQuery = `
      SELECT 
        COALESCE(SUM(amount::numeric), 0) as total_saved,
        COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN amount::numeric ELSE 0 END), 0) as saved_30d
      FROM savings_saved_events
    `;

		const withdrawnQuery = `
      SELECT 
        COALESCE(SUM(amount::numeric), 0) as total_withdrawn,
        COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN amount::numeric ELSE 0 END), 0) as withdrawn_30d
      FROM savings_withdrawn_events
    `;

		const interestQuery = `
      SELECT 
        COALESCE(SUM(interest::numeric), 0) as total_interest,
        COUNT(DISTINCT account) as active_savers
      FROM savings_interest_collected_events
    `;

		const [savedResults, withdrawnResults, interestResults] = await Promise.all([
			this.databaseService.fetch(savedQuery),
			this.databaseService.fetch(withdrawnQuery),
			this.databaseService.fetch(interestQuery),
		]);

		const savedData = savedResults[0];
		const withdrawnData = withdrawnResults[0];
		const interestData = interestResults[0];
		const metrics: SavingsOverviewMetrics = {
			saved: {
				total: savedData.total_saved.toString(),
				month: savedData.saved_30d.toString(),
			},
			withdrawn: {
				total: withdrawnData.total_withdrawn.toString(),
				month: withdrawnData.withdrawn_30d.toString(),
			},
			interestPaid: interestData.total_interest.toString(),
			activeSavers: parseInt(interestData.active_savers),
		};

		this.cacheService.set(cacheKey, metrics);
		return metrics;
	}

	async getEquityTradingMetrics(): Promise<EquityTradingMetrics> {
		const cacheKey = 'equity:trading';
		const cached = this.cacheService.get<EquityTradingMetrics>(cacheKey);
		if (cached) return cached;

		const volumeQuery = `
      SELECT 
        COALESCE(SUM(tot_price::numeric), 0) as total_volume,
        COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN tot_price::numeric ELSE 0 END), 0) as volume_30d,
        COUNT(*) as total_trades,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN 1 END) as trades_30d,
        COUNT(DISTINCT who) as active_traders
      FROM equity_trade_events
    `;

		const priceQuery = `
      SELECT 
        new_price::numeric as current_price,
        LAG(new_price::numeric) OVER (ORDER BY timestamp DESC) as prev_price_30d
      FROM equity_trade_events 
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      ORDER BY timestamp DESC 
      LIMIT 1
    `;

		const [volumeResults, priceResults] = await Promise.all([
			this.databaseService.fetch(volumeQuery),
			this.databaseService.fetch(priceQuery),
		]);

		const volumeData = volumeResults[0];
		const priceData = priceResults[0] || { current_price: '0', prev_price_30d: '0' };

		const currentPrice = parseFloat(priceData.current_price || '0');
		const prevPrice = parseFloat(priceData.prev_price_30d || '0');
		const priceChange = prevPrice > 0 ? (((currentPrice - prevPrice) / prevPrice) * 100).toFixed(1) : '0.0';

		const metrics: EquityTradingMetrics = {
			volume: {
				total: volumeData.total_volume.toString(),
				month: volumeData.volume_30d.toString(),
			},
			trades: {
				total: parseInt(volumeData.total_trades),
				month: parseInt(volumeData.trades_30d),
			},
			currentPrice: currentPrice.toString(),
			priceChange30d: `${priceChange}%`,
			activeTraders: parseInt(volumeData.active_traders),
		};

		this.cacheService.set(cacheKey, metrics);
		return metrics;
	}

	async getMintingPositionMetrics(): Promise<MintingPositionMetrics> {
		const cacheKey = 'minting:positions';
		const cached = this.cacheService.get<MintingPositionMetrics>(cacheKey);
		if (cached) return cached;

		const positionQuery = `
      SELECT 
        COUNT(*) as total_positions,
        COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN 1 END) as positions_30d,
        COUNT(DISTINCT owner) as unique_owners
      FROM mintinghub_position_opened_events
    `;

		const collateralQuery = `
      SELECT 
        collateral, 
        COUNT(*) as count
      FROM mintinghub_position_opened_events
      GROUP BY collateral
    `;

		const [positionResults, collateralResults] = await Promise.all([
			this.databaseService.fetch(positionQuery),
			this.databaseService.fetch(collateralQuery),
		]);

		const positionData = positionResults[0];
		const collateralTypes: Record<string, number> = {};

		collateralResults.forEach((row: any) => {
			collateralTypes[row.collateral] = parseInt(row.count);
		});

		const metrics: MintingPositionMetrics = {
			totalPositions: parseInt(positionData.total_positions),
			month: parseInt(positionData.positions_30d),
			uniqueOwners: parseInt(positionData.unique_owners),
			collateralTypes,
		};

		this.cacheService.set(cacheKey, metrics);
		return metrics;
	}
}

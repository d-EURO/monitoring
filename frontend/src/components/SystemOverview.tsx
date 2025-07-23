import type { DeuroState } from '../types/index';
import { colors, spacing } from '../lib/theme';
import { formatNumber, formatPercent } from '../lib/formatters';
import type { DataState } from '../lib/api.hook';

export function SystemOverview({ data, error }: DataState<DeuroState>) {
	if (error) return <div className={colors.critical}>{error}</div>;
	if (!data) return null;

	return (
		<div className={`${colors.background} ${colors.table.border} border rounded-xl p-4`}>
			<h2 className={`text-sm uppercase tracking-wider ${colors.text.primary} mb-4`}>SYSTEM OVERVIEW</h2>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-8">
				<Section title="SUPPLY">
					<Metric label="dEURO" value={formatNumber(data.deuroTotalSupply, 18, 2)} valueClass={colors.text.primary} />
					<Metric label="nDEPS" value={formatNumber(data.equityShares, 18, 2)} />
					<Metric label="DEPS" value={formatNumber(data.depsTotalSupply, 18, 2)} />
				</Section>

				<Section title="RESERVES">
					<Metric label="Total" value={formatNumber(data.reserveTotal, 18, 2)} />
					<Metric label="Minter" value={formatNumber(data.reserveMinter, 18, 2)} />
					<Metric label="Equity" value={formatNumber(data.reserveEquity, 18, 2)} valueClass={colors.success} />
				</Section>

				<Section title="24H ACTIVITY">
					<Metric label="dEURO Vol" value={formatNumber(data.deuroVolume24h, 18, 2)} />
					<Metric label="Transfers" value={data.deuroTransferCount24h.toLocaleString()} />
					<Metric label="Unique Addr" value={data.deuroUniqueAddresses24h.toLocaleString()} />
				</Section>

				<Section title="24H MINT/BURN">
					<Metric label="Minted" value={formatNumber(data.deuroMinted24h || '0', 18, 2)} />
					<Metric label="Burned" value={formatNumber(data.deuroBurned24h || '0', 18, 2)} />
					<Metric
						label="Net"
						value={formatNumber((BigInt(data.deuroMinted24h || '0') - BigInt(data.deuroBurned24h || '0')).toString(), 18, 2)}
					/>
				</Section>

				<Section title="SAVINGS">
					<Metric label="Total" value={formatNumber(data.savingsTotal, 18, 2)} valueClass={colors.text.primary} />
					<Metric label="Rate" value={formatPercent(Number(data.savingsRate) / 10_000, 2)} />
					<Metric label="Interest" value={formatNumber(data.savingsInterestCollected, 18, 2)} />
				</Section>

				<Section title="EQUITY">
					<Metric label="Price" value={`${formatNumber(data.equityPrice, 18, 4)}`} valueClass={colors.text.primary} />
					<Metric label="24h Volume" value={formatNumber(data.equityTradeVolume24h, 18, 2)} />
					<Metric label="24h Trades" value={data.equityTradeCount24h.toLocaleString()} />
				</Section>

				<Section title="PROFIT & LOSS">
					<Metric label="Profit" value={formatNumber(data.deuroProfit, 18, 2)} valueClass={colors.success} />
					<Metric label="Loss" value={formatNumber(data.deuroLoss, 18, 2)} />
					<Metric label="Distributed" value={formatNumber(data.deuroProfitDistributed, 18, 2)} />
				</Section>

				{data.usdToEurRate && (
					<Section title="CURRENCY RATES">
						<Metric label="USD/EUR" value={formatNumber(data.usdToEurRate, 0, 4)} />
						<Metric label="USD/CHF" value={formatNumber(data.usdToChfRate || 0, 0, 4)} />
					</Section>
				)}
			</div>
		</div>
	);
}

function Metric({ label, value, valueClass = colors.text.secondary }: { label: string; value: string | number; valueClass?: string }) {
	return (
		<div className="flex justify-between">
			<span className={colors.text.secondary}>{label}:</span>
			<span className={valueClass}>{value}</span>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div>
			<h3 className={`text-xs uppercase tracking-wider ${colors.text.primary} mb-2`}>{title}</h3>
			<div className={`${spacing.compact} text-sm`}>{children}</div>
		</div>
	);
}

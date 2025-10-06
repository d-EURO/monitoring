import type { DeuroState } from '../../../shared/types';
import { colors, spacing } from '../lib/theme';
import { formatNumber, formatPercent } from '../lib/formatters';
import type { DataState } from '../lib/api.hook';

export function SystemOverview({ data, error }: DataState<DeuroState>) {
	if (error) return <div className={colors.critical}>{error}</div>;
	if (!data) return null;

	const deuroProfit = parseFloat(data.deuroProfit);
	const netProfit = deuroProfit - parseFloat(data.deuroLoss);

	return (
		<div className={`${colors.background} ${colors.table.border} border rounded-xl p-4`}>
			<h2 className={`text-sm uppercase tracking-wider ${colors.text.primary} mb-4`}>SYSTEM OVERVIEW</h2>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
				<Section title="SUPPLY">
					<Metric label="dEURO" value={formatNumber(data.deuroTotalSupply, 0, 2)} valueClass={colors.text.primary} />
					<Metric label="nDEPS" value={formatNumber(data.equityShares, 0, 2)} />
					<Metric label="DEPS" value={formatNumber(data.depsTotalSupply, 0, 2)} />
				</Section>

				<Section title="RESERVES">
					<Metric label="Total" value={formatNumber(data.reserveTotal, 0, 2)} />
					<Metric label="Minter" value={formatNumber(data.reserveMinter, 0, 2)} />
					<Metric label="Equity" value={formatNumber(data.reserveEquity, 0, 2)} valueClass={colors.success} />
				</Section>

				{data.deuroVolume24h && (
					<Section title="24H ACTIVITY (dEURO)">
						<Metric label="Volume" value={formatNumber(data.deuroVolume24h, 0, 2)} />
						{data.deuroTransferCount24h !== undefined && <Metric label="Transfers" value={data.deuroTransferCount24h.toLocaleString()} />}
						{data.deuroUniqueAddresses24h !== undefined && <Metric label="Addresses" value={data.deuroUniqueAddresses24h.toLocaleString()} />}
					</Section>
				)}

				<Section title="EQUITY">
					<Metric label="Price" value={`${formatNumber(data.equityPrice, 0, 4)}`} valueClass={colors.text.primary} />
					<Metric label="Profit" value={formatNumber(netProfit, 0, 2)} valueClass={colors.success} />
					<Metric label="24h Vol" value={formatNumber(data.equityTradeVolume24h, 0, 2) + ` (${data.equityTradeCount24h.toLocaleString()})`} />
					<Metric label="24h Delegations" value={data.equityDelegations24h.toLocaleString()} />
				</Section>

				<Section title="SAVINGS">
					<Metric label="Total" value={formatNumber(data.savingsTotal, 0, 2)} valueClass={colors.text.primary} />
					<Metric label="Interest" value={formatNumber(data.savingsInterestCollected, 0, 2)} />
					<Metric label="Rate" value={formatPercent(Number(data.savingsRate) / 10_000, 2)} />
				</Section>

				<Section title="SAVINGS 24H">
					<Metric label="Interest" value={formatNumber(data.savingsInterestCollected24h, 0, 2)} />
					<Metric label="Added" value={formatNumber(data.savingsAdded24h, 0, 2)} />
					<Metric label="Withdrawn" value={formatNumber(data.savingsWithdrawn24h, 0, 2)} />
				</Section>

				{(data.deuroMinted24h || data.deuroBurned24h) && (
					<Section title="24H MINT/BURN (dEURO)">
						<Metric label="Minted" value={formatNumber(data.deuroMinted24h || '0', 0, 2)} />
						<Metric label="Burned" value={formatNumber(data.deuroBurned24h || '0', 0, 2)} />
						<Metric
							label="Net"
							value={formatNumber((parseFloat(data.deuroMinted24h || '0') - parseFloat(data.deuroBurned24h || '0')), 0, 2)}
						/>
					</Section>
				)}

				{(data.usdToEurRate || data.usdToChfRate) && (
					<Section title="CURRENCY RATES">
						{data.usdToEurRate && <Metric label="USD/EUR" value={formatNumber(1 / data.usdToEurRate, 0, 4)} />}
						{data.usdToChfRate && <Metric label="USD/CHF" value={formatNumber(1 / data.usdToChfRate, 0, 4)} />}
					</Section>
				)}
			</div>
		</div>
	);
}

function Metric({ label, value, valueClass = colors.text.secondary }: { label: string; value: string | number; valueClass?: string }) {
	return (
		<div className="flex justify-between">
			<span className={colors.text.secondary}>{label}</span>
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

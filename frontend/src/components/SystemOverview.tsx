import type { DeuroState } from '../types/index';
import { colors, spacing } from '../lib/theme';
import { formatNumber, formatCurrency, formatPercent } from '../lib/formatters';

interface Props {
	data: DeuroState | null;
	loading: boolean;
	error: string | null;
}

interface MetricProps {
	label: string;
	value: string | number;
	valueClass?: string;
}

function Metric({ label, value, valueClass = colors.text.secondary }: MetricProps) {
	return (
		<div className="flex justify-between">
			<span className={colors.text.secondary}>{label}:</span>
			<span className={valueClass}>{value}</span>
		</div>
	);
}

interface SectionProps {
	title: string;
	children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
	return (
		<div>
			<h3 className={`text-xs uppercase tracking-wider ${colors.text.primary} mb-2`}>{title}</h3>
			<div className={`${spacing.compact} text-sm`}>{children}</div>
		</div>
	);
}

export function SystemOverview({ data, loading, error }: Props) {
	if (loading) return <div className={colors.text.secondary}>Loading system overview...</div>;
	if (error) return <div className={colors.critical}>Error: {error}</div>;
	if (!data) return null;

	// Calculate equity price in human-readable format
	const equityPrice = Number(BigInt(data.equityPrice)) / Number(BigInt(10 ** 18));

	return (
		<div className={`${colors.background} ${colors.table.border} border rounded-xl p-4`}>
			<h2 className={`text-sm uppercase tracking-wider ${colors.text.primary} mb-4`}>SYSTEM OVERVIEW</h2>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-8">
				{/* Supply Section */}
				<Section title="SUPPLY">
					<Metric label="dEURO" value={formatNumber(data.deuroTotalSupply)} valueClass={colors.text.primary} />
					<Metric label="nDEPS" value={formatNumber(data.equityShares)} />
					<Metric label="DEPS" value={formatNumber(data.depsTotalSupply)} />
				</Section>

				{/* Reserves Section */}
				<Section title="RESERVES">
					<Metric label="Total" value={formatNumber(data.reserveTotal)} />
					<Metric label="Minter" value={formatNumber(data.reserveMinter)} />
					<Metric label="Equity" value={formatNumber(data.reserveEquity)} valueClass={colors.success} />
				</Section>

				{/* 24h Activity */}
				<Section title="24H ACTIVITY">
					<Metric label="dEURO Vol" value={formatNumber(data.deuroVolume24h)} />
					<Metric label="Transfers" value={data.deuroTransferCount24h.toLocaleString()} />
					<Metric label="Unique Addr" value={data.deuroUniqueAddresses24h.toLocaleString()} />
				</Section>

				{/* 24h Mint/Burn */}
				<Section title="24H MINT/BURN">
					<Metric label="Minted" value={formatNumber(data.deuroMinted24h || '0')} />
					<Metric label="Burned" value={formatNumber(data.deuroBurned24h || '0')} />
					<Metric
						label="Net"
						value={formatNumber((BigInt(data.deuroMinted24h || '0') - BigInt(data.deuroBurned24h || '0')).toString())}
					/>
				</Section>

				{/* Savings Section */}
				<Section title="SAVINGS">
					<Metric label="Total" value={formatNumber(data.savingsTotal)} valueClass={colors.text.primary} />
					<Metric label="Rate" value={formatPercent(Number(data.savingsRate) / 10_000, 2)} />
					<Metric label="Interest" value={formatNumber(data.savingsInterestCollected)} />
				</Section>

				{/* Equity Section */}
				<Section title="EQUITY">
					<Metric label="Price" value={`${formatCurrency(equityPrice, 4)}`} valueClass={colors.text.primary}/>
					<Metric label="24h Volume" value={formatNumber(data.equityTradeVolume24h)} />
					<Metric label="24h Trades" value={data.equityTradeCount24h.toLocaleString()} />
				</Section>

				{/* P&L Section */}
				<Section title="PROFIT & LOSS">
					<Metric label="Profit" value={formatNumber(data.deuroProfit)} valueClass={colors.success} />
					<Metric label="Loss" value={formatNumber(data.deuroLoss)} />
					<Metric label="Distributed" value={formatNumber(data.deuroProfitDistributed)} />
				</Section>

				{/* Currency Rates (if available) */}
				{data.usdToEurRate && (
					<Section title="CURRENCY RATES">
						<Metric label="USD/EUR" value={formatCurrency(data.usdToEurRate, 4)} />
						<Metric label="USD/CHF" value={formatCurrency(data.usdToChfRate || 0, 4)} />
					</Section>
				)}
			</div>
		</div>
	);
}

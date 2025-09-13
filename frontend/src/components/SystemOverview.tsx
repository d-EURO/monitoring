import type { DeuroState } from '../types/index';
import { colors, spacing } from '../lib/theme';
import { formatNumber, formatPercent } from '../lib/formatters';
import type { DataState } from '../lib/api.hook';
import { useEffect, useState } from 'react';

interface SystemOverviewProps extends DataState<DeuroState> {}

export function SystemOverview({ data, error }: SystemOverviewProps) {
	const [totalMinters, setTotalMinters] = useState<number>(0);
	const [dbMinters, setDbMinters] = useState<number>(0);

	useEffect(() => {
		const apiUrl = import.meta.env.VITE_API_BASE_URL;
		if (!apiUrl) return;

		const fetchMinterCounts = async () => {
			try {
				// Fetch both counts in parallel
				const [totalResponse, dbResponse] = await Promise.all([
					fetch(`${apiUrl}/minters/total-count`),
					fetch(`${apiUrl}/minters`)
				]);

				if (totalResponse.ok) {
					const result = await totalResponse.json();
					setTotalMinters(result.count);
				}

				if (dbResponse.ok) {
					const result = await dbResponse.json();
					setDbMinters(result.length);
				}
			} catch (err) {
				console.error('Failed to fetch minter counts:', err);
			}
		};

		fetchMinterCounts();
		// Refresh every minute
		const interval = setInterval(fetchMinterCounts, 60000);
		return () => clearInterval(interval);
	}, []);

	if (error) return <div className={colors.critical}>{error}</div>;
	if (!data) return null;

	// 300'000 dEURO manually added to Equity contract during liquidiation of WFPS postions (26.06.2025-29.06.2025)
	const deuroProfit = BigInt(data.deuroProfit) + 300_000n * 10n ** 18n;
	const netProfit = deuroProfit - BigInt(data.deuroLoss);

	// Check for minter discrepancy
	const hasMinterDiscrepancy = totalMinters > 0 && dbMinters > 0 && totalMinters !== dbMinters;

	return (
		<>
			{hasMinterDiscrepancy && (
				<div className="bg-red-600 text-white p-3 rounded-xl mb-4 font-bold text-center animate-pulse">
					⚠️ WARNING: Minter database capture incomplete! Blockchain: {totalMinters} | Database: {dbMinters}
				</div>
			)}
			<div className={`${colors.background} ${colors.table.border} border rounded-xl p-4`}>
				<h2 className={`text-sm uppercase tracking-wider ${colors.text.primary} mb-4`}>SYSTEM OVERVIEW</h2>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
				<Section title="SUPPLY">
					<Metric label="dEURO" value={formatNumber(data.deuroTotalSupply, 18, 2)} valueClass={colors.text.primary} />
					<Metric label="nDEPS" value={formatNumber(data.equityShares, 18, 2)} />
					<Metric label="DEPS" value={formatNumber(data.depsTotalSupply, 18, 2)} />
				</Section>

				<Section title="MINTERS">
					<Metric label="Total Applications (Blockchain)" value={totalMinters.toString()} valueClass={colors.text.primary} />
					<Metric label="Captured in Database" value={dbMinters.toString()} valueClass={colors.text.secondary} />
				</Section>

				<Section title="RESERVES">
					<Metric label="Total" value={formatNumber(data.reserveTotal, 18, 2)} />
					<Metric label="Minter" value={formatNumber(data.reserveMinter, 18, 2)} />
					<Metric label="Equity" value={formatNumber(data.reserveEquity, 18, 2)} valueClass={colors.success} />
				</Section>

				<Section title="24H ACTIVITY (dEURO)">
					<Metric label="Volume" value={formatNumber(data.deuroVolume24h, 18, 2)} />
					<Metric label="Transfers" value={data.deuroTransferCount24h.toLocaleString()} />
					<Metric label="Addresses" value={data.deuroUniqueAddresses24h.toLocaleString()} />
				</Section>

				<Section title="EQUITY">
					<Metric label="Price" value={`${formatNumber(data.equityPrice, 18, 4)}`} valueClass={colors.text.primary} />
					<Metric label="Profit" value={formatNumber(netProfit, 18, 2)} valueClass={colors.success} />
					<Metric label="24h Vol" value={formatNumber(data.equityTradeVolume24h, 18, 2) + ` (${data.equityTradeCount24h.toLocaleString()})`} />
				</Section>

				<Section title="SAVINGS">
					<Metric label="Total" value={formatNumber(data.savingsTotal, 18, 2)} valueClass={colors.text.primary} />
					<Metric label="Interest" value={formatNumber(data.savingsInterestCollected, 18, 2)} />
					<Metric label="Rate" value={formatPercent(Number(data.savingsRate) / 10_000, 2)} />
				</Section>

				<Section title="24H MINT/BURN (dEURO)">
					<Metric label="Minted" value={formatNumber(data.deuroMinted24h || '0', 18, 2)} />
					<Metric label="Burned" value={formatNumber(data.deuroBurned24h || '0', 18, 2)} />
					<Metric
						label="Net"
						value={formatNumber((BigInt(data.deuroMinted24h || '0') - BigInt(data.deuroBurned24h || '0')).toString(), 18, 2)}
					/>
				</Section>

				{(data.usdToEurRate || data.usdToChfRate) && (
					<Section title="CURRENCY RATES">
						{data.usdToEurRate && <Metric label="USD/EUR" value={formatNumber(1 / data.usdToEurRate, 0, 4)} />}
						{data.usdToChfRate && <Metric label="USD/CHF" value={formatNumber(1 / data.usdToChfRate, 0, 4)} />}
					</Section>
				)}
			</div>
		</div>
		</>
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

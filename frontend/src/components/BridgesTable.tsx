import type { Bridge } from '../types/index';
import { Table } from './Table';
import type { Column, CellContent } from './Table';
import { colors } from '../lib/theme';
import { formatAddress, formatNumber, formatPercent, formatCountdown, bigintToNumber, formatCurrency } from '../lib/formatters';
import { AddressLink } from './AddressLink';

interface Props {
	data: Bridge[] | null;
	loading: boolean;
	error: string | null;
}

function isActive(horizon: string): boolean {
	const horizonTime = BigInt(horizon);
	const currentTime = BigInt(Math.floor(Date.now() / 1000));
	return horizonTime > currentTime;
}

function getUtilizationColor(utilization: number): string {
	if (utilization > 90) return colors.critical;
	if (utilization > 70) return colors.highlight;
	return colors.success;
}

export function BridgesTable({ data, loading, error }: Props) {
	const columns: Column<Bridge>[] = [
		{
			header: { primary: 'BRIDGE', secondary: 'EUR TOKEN' },
			width: '250px',
			format: (bridge): CellContent => ({
				primary: <AddressLink address={bridge.address} label={bridge.eurSymbol} />,
				secondary: <AddressLink address={bridge.eurAddress} />,
			}),
		},
		{
			header: { primary: 'STATUS', secondary: 'EXPIRY' },
			width: '150px',
			align: 'right',
			format: (bridge): CellContent => {
				const active = isActive(bridge.horizon);
				return {
					primary: active ? 'ACTIVE' : 'INACTIVE',
					secondary: active ? formatCountdown(bridge.horizon) : 'Expired',
				};
			},
		},
		{
			header: { primary: 'MINTED', secondary: 'LIMIT' },
			width: '150px',
			align: 'right',
			format: (bridge): CellContent => ({
				primary: formatCurrency(bigintToNumber(bridge.minted, 18)),
				secondary: formatCurrency(bigintToNumber(bridge.limit, 18)),
			}),
		},
		{
			header: 'UTIL. %',
			width: '120px',
			align: 'right',
			format: (bridge) => {
				const minted = Number(bigintToNumber(bridge.minted, 18));
				const limit = Number(bigintToNumber(bridge.limit, 18));
				const utilization = limit > 0 ? (minted * 10000) / (limit * 100) : 0;
				return <span className={getUtilizationColor(utilization)}>{formatPercent(utilization)}</span>;
			},
		},
	];

	return (
		<Table
			title="BRIDGES"
			data={data}
			loading={loading}
			error={error}
			columns={columns}
			getRowKey={(bridge) => bridge.address}
			shouldDimRow={(bridge) => !isActive(bridge.horizon)}
			emptyMessage="No bridges found"
		/>
	);
}

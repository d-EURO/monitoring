import type { Bridge, Minter } from '../types/index';
import { Alignment, Table } from './Table';
import type { Column, MultiLineCell } from './Table';
import { formatNumber, bigintToNumber, formatCountdown, formatDateTime, formatPercent, getStatusColor } from '../lib/formatters';
import { AddressLink } from './AddressLink';
import { colors } from '../lib/theme';
import type { DataState } from '../lib/api.hook';

interface MinterTableProps {
	data?: DataState<Minter[]>;
	bridgeData?: Bridge[];
}

export function MintersTable({ data, bridgeData }: MinterTableProps) {
	const bridgeMap = new Map<string, Bridge>();
	bridgeData?.forEach((b) => bridgeMap.set(b.address.toLowerCase(), b));

	const columns: Column<Minter>[] = [
		{
			header: { primary: 'MINTER', secondary: 'MESSAGE' },
			format: (minter): MultiLineCell => ({
				primary: <AddressLink address={minter.minter} className="font-mono" />,
				secondary: minter.status,
				secondaryClass: getStatusColor(minter.status),
			}),
		},
		{
			header: { primary: 'START', secondary: 'MESSAGE' },
			format: (minter): MultiLineCell => {
				const startDate = new Date(minter.applicationDate).getTime() / 1000 + Number(minter.applicationPeriod);
				const hasStarted = startDate <= Date.now() / 1000;
				return {
					primary: hasStarted ? formatDateTime(startDate) : formatCountdown(startDate),
					secondary: minter.message ? minter.message.slice(0, 40) + (minter.message.length > 40 ? '...' : '') : '-',
					primaryClass: hasStarted ? undefined : colors.critical,
				};
			},
		},
		{
			header: { primary: 'MINTED', secondary: 'LIMIT' },
			align: Alignment.RIGHT,
			format: (minter): MultiLineCell => {
				const bridge = bridgeMap.get(minter.minter.toLowerCase());
				return {
					primary: bridge ? formatNumber(bridge.minted, 18) : '-',
					secondary: bridge ? formatNumber(bridge.limit, 18) : '-',
				};
			},
		},
		{
			header: { primary: 'UTIL. %', secondary: 'AVAILABLE' },
			align: Alignment.RIGHT,
			format: (minter) => {
				const bridge = bridgeMap.get(minter.minter.toLowerCase());
				const minted = bridge && bigintToNumber(bridge?.minted, 18);
				const limit = bridge && bigintToNumber(bridge?.limit, 18);
				const utilization = limit && minted ? (limit > 0 ? (minted * 10000) / (limit * 100) : 0) : undefined;
				const availableForMint = limit && minted ? formatNumber(limit - minted) : '-';
				return {
					primary: utilization !== undefined ? formatPercent(utilization) : '-',
					secondary: availableForMint,
					primaryClass: utilization !== undefined ? getUtilizationColor(utilization) : undefined,
				};
			},
		},
		{
			header: { primary: 'EXPIRY', secondary: 'COUNTDOWN' },
			align: Alignment.RIGHT,
			format: (minter): MultiLineCell => {
				const bridge = bridgeMap.get(minter.minter.toLowerCase());
				return {
					primary: bridge?.horizon ? formatDateTime(Number(bridge?.horizon)) : '-',
					secondary: bridge?.horizon ? formatCountdown(bridge?.horizon) : '-',
				};
			},
		},
	];

	return (
		<Table
			title="MINTERS"
			data={data?.data}
			error={data?.error}
			columns={columns}
			getRowKey={(minter) => minter.minter}
			shouldDimRow={(minter) => !isActive(bridgeMap.get(minter.minter.toLowerCase())?.horizon)}
			emptyMessage="No minters found"
		/>
	);
}

function isActive(horizon?: string): boolean {
	if (!horizon) return true;
	const horizonTime = BigInt(horizon);
	const currentTime = BigInt(Math.floor(Date.now() / 1000));
	return horizonTime > currentTime;
}

function getUtilizationColor(utilization: number): string {
	if (utilization > 90) return colors.critical;
	if (utilization > 70) return colors.highlight;
	return colors.success;
}

import { PositionStatus, type PositionResponse } from '../../../shared/types';
import { Alignment, Table } from './Table';
import type { Column, MultiLineCell } from './Table';
import { colors } from '../lib/theme';
import { formatNumber, formatPercent, formatDateTime, formatCountdown, getStatusColor } from '../lib/formatters';
import { AddressLink } from './AddressLink';
import type { DataState } from '../lib/api.hook';

interface PositionsTableProps {
	data?: DataState<PositionResponse[]>;
}

export function PositionsTable({ data }: PositionsTableProps) {
	const columns: Column<PositionResponse>[] = [
		{
			header: { primary: 'CREATED', secondary: 'STATUS' },
			format: (position): MultiLineCell => {
				const inCooldown = position.status === PositionStatus.COOLDOWN;
				const primaryContent = inCooldown
					? formatCountdown(position.cooldown)
					: position.created
						? formatDateTime(Number(position.created))
						: '-';
				return {
					primary: primaryContent,
					secondary: position.status,
					primaryClass: inCooldown ? colors.critical : undefined,
					secondaryClass: getStatusColor(position.status),
				};
			},
		},
		{
			header: { primary: 'POSITION', secondary: 'OWNER' },
			format: (position): MultiLineCell => ({
				primary: (
					<span>
						<AddressLink address={position.address} className="font-mono" />
						{position.address === position.original ? ' (O)' : ''}
					</span>
				),
				secondary: <AddressLink address={position.owner} className="font-mono" />,
			}),
		},
		{
			header: { primary: 'COLLATERAL', secondary: 'BALANCE' },
			align: Alignment.RIGHT,
			format: (position): MultiLineCell => {
				return {
					primary: <AddressLink address={position.collateral} label={position.collateralSymbol} />,
					secondary: formatNumber(Number(position.collateralBalance)),
				};
			},
		},
		{
			header: { primary: 'LIQ. PRICE', secondary: 'MARKET PRICE' },
			align: Alignment.RIGHT,
			format: (position): MultiLineCell => {
				return {
					primary: formatNumber(Number(position.virtualPrice)),
					secondary: position.marketPrice ? formatNumber(Number(position.marketPrice)) : '-',
				};
			},
		},
		{
			header: { primary: 'DEBT', secondary: 'COL. %' },
			align: Alignment.RIGHT,
			format: (position): MultiLineCell => {
				const ratio = Number(position.collateralizationRatio || '0');
				return {
					primary: formatNumber(Number(position.debt)),
					secondary: formatPercent(ratio),
					secondaryClass: !position.isClosed ? getCollateralizationColor(ratio) : undefined,
				};
			},
		},
		{
			header: { primary: 'EXPIRY', secondary: 'COUNTDOWN' },
			align: Alignment.RIGHT,
			format: (position): MultiLineCell => {
				return {
					primary: position.expiration ? formatDateTime(Number(position.expiration)) : '-',
					secondary: position.cooldown ? formatCountdown(position.expiration) : '-',
				};
			},
		},
	];

	return (
		<Table
			title="POSITIONS"
			data={data?.data}
			sort={(a, b) => Number(b.created) - Number(a.created)}
			error={data?.error}
			columns={columns}
			getRowKey={(position) => position.address}
			hidden={(position) => position.isClosed}
			emptyMessage="No positions found"
		/>
	);
}

export function getCollateralizationColor(ratio: number | null): string {
	if (!ratio) return colors.text.muted;
	if (ratio >= 120) return colors.success;
	if (ratio >= 105) return colors.highlight;
	return colors.critical;
}

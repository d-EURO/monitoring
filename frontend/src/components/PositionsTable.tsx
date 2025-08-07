import type { Position, Collateral } from '../types/index';
import { Alignment, Table } from './Table';
import type { Column, MultiLineCell } from './Table';
import { colors } from '../lib/theme';
import { formatNumber, formatPercent, formatDateTime, bigintToNumber, formatCountdown, getStatusColor } from '../lib/formatters';
import { AddressLink } from './AddressLink';
import type { DataState } from '../lib/api.hook';

interface PositionsTableProps {
	data?: DataState<Position[]>;
	collateralData?: Collateral[];
}

export function PositionsTable({ data, collateralData }: PositionsTableProps) {
	const collateralMap = new Map<string, Collateral>();
	collateralData?.forEach((c) => collateralMap.set(c.tokenAddress.toLowerCase(), c));

	const columns: Column<Position>[] = [
		{
			header: { primary: 'CREATED', secondary: 'STATUS' },
			format: (position): MultiLineCell => {
				const inCooldown = position.status === 'COOLDOWN';
				const primaryContent = inCooldown
					? formatCountdown(position.cooldown)
					: position.created
						? formatDateTime(position.created)
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
					<AddressLink
						address={position.address}
						className="font-mono"
						colorClass={position.address === position.original ? colors.highlight : colors.text.primary}
					/>
				),
				secondary: <AddressLink address={position.owner} className="font-mono" />,
			}),
		},
		{
			header: { primary: 'COLLATERAL', secondary: 'BALANCE' },
			align: Alignment.RIGHT,
			format: (position): MultiLineCell => {
				const collateral = collateralMap.get(position.collateralAddress.toLowerCase());
				return {
					primary: <AddressLink address={position.collateralAddress} label={collateral?.symbol} />,
					secondary: formatNumber(position.collateralBalance, collateral?.decimals || 18),
				};
			},
		},
		{
			header: { primary: 'LIQ. PRICE', secondary: 'MARKET PRICE' },
			align: Alignment.RIGHT,
			format: (position): MultiLineCell => {
				const collateral = collateralMap.get(position.collateralAddress.toLowerCase());
				const virtualPrice = bigintToNumber(position.virtualPrice, 36 - (collateral?.decimals ?? 18));
				return {
					primary: formatNumber(virtualPrice),
					secondary: collateral?.price ? formatNumber(collateral?.price) : '-',
				};
			},
		},
		{
			header: { primary: 'DEBT', secondary: 'COL. %' },
			align: Alignment.RIGHT,
			format: (position): MultiLineCell => {
				const collateral = collateralMap.get(position.collateralAddress.toLowerCase());
				const virtualPrice = bigintToNumber(position.virtualPrice, 36 - (collateral?.decimals ?? 18));
				const ratio = calculateCollateralizationRatio(collateral?.price, virtualPrice);
				return {
					primary: formatNumber(position.debt, 18, 2),
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
			error={data?.error}
			columns={columns}
			getRowKey={(position) => position.address}
			shouldDimRow={(position) => position.isClosed}
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

function calculateCollateralizationRatio(marketPrice: string | undefined, virtualPrice: string | number): number | null {
	if (!marketPrice || marketPrice === '0' || virtualPrice === '0') {
		return null;
	}

	return (Number(marketPrice) / Number(virtualPrice)) * 100;
}

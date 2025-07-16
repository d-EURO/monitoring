import type { Position, Collateral } from '../types/index';
import { Table } from './Table';
import type { Column, CellContent } from './Table';
import { colors } from '../lib/theme';
import { formatNumber, formatCurrency, formatPercent, getCollateralizationColor, formatDateTime, bigintToNumber, formatCountdown } from '../lib/formatters';
import { AddressLink } from './AddressLink';

interface Props {
	data: Position[] | null;
	loading: boolean;
	error: string | null;
	collateralData: Collateral[] | null;
}

function calculateCollateralizationRatio(marketPrice: string | undefined, virtualPrice: string | number): number | null {
	if (!marketPrice || marketPrice === '0' || virtualPrice === '0') {
		return null;
	}

	// Both prices are already in EUR with same decimals, so simple division
	return (Number(marketPrice) / Number(virtualPrice)) * 100; // Return as percentage
}

export function PositionsTable({ data, loading, error, collateralData }: Props) {
	const collateralMap = new Map<string, Collateral>();
	collateralData?.forEach((c) => collateralMap.set(c.tokenAddress.toLowerCase(), c));

	const columns: Column<Position>[] = [
		{
			header: { primary: 'CREATED', secondary: 'STATUS' },
			width: '140px',
			format: (position): CellContent => ({
				primary: position.created ? formatDateTime(position.created) : '-',
				secondary: position.status,
			}),
		},
		{
			header: { primary: 'POSITION', secondary: 'OWNER' },
			width: '180px',
			format: (position): CellContent => ({
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
			width: '150px',
			align: 'right',
			format: (position): CellContent => {
				const collateral = collateralMap.get(position.collateralAddress.toLowerCase());
				return {
					primary: <AddressLink address={position.collateralAddress} label={collateral?.symbol} />,
					secondary: formatNumber(position.collateralBalance, collateral?.decimals || 18),
				};
			},
		},
    {
			header: { primary: 'LIQ. PRICE', secondary: 'MARKET PRICE' },
			width: '150px',
			align: 'right',
			format: (position): CellContent => {
				const collateral = collateralMap.get(position.collateralAddress.toLowerCase());
				const virtualPrice = bigintToNumber(position.virtualPrice, 36 - (collateral?.decimals ?? 18));
				return {
					primary: formatCurrency(virtualPrice),
					secondary: collateral?.price ? formatCurrency(collateral?.price) : '-',
				};
			},
		},
    {
			header: { primary: 'DEBT', secondary: 'COL. %' },
			width: '150px',
			align: 'right',
			format: (position): CellContent => {
				const collateral = collateralMap.get(position.collateralAddress.toLowerCase());
				const virtualPrice = bigintToNumber(position.virtualPrice, 36 - (collateral?.decimals ?? 18));
				const ratio = calculateCollateralizationRatio(collateral?.price, virtualPrice);
				return {
					primary: formatNumber(position.debt),
					secondary: formatPercent(ratio),
					secondaryClass: !position.isClosed ? getCollateralizationColor(ratio) : undefined,
				};
			},
		},
		{
			header: { primary: 'EXPIRY', secondary: 'COUNTDOWN' },
			width: '150px',
			align: 'right',
			format: (position): CellContent => {
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
			data={data}
			loading={loading}
			error={error}
			columns={columns}
			getRowKey={(position) => position.address}
			shouldDimRow={(position) => position.isClosed}
			emptyMessage="No positions found"
		/>
	);
}

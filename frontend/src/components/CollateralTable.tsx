import type { Collateral } from '../types/index';
import { Table } from './Table';
import type { Column, CellContent } from './Table';
import { colors } from '../lib/theme';
import { formatNumber, formatCurrency, bigintToNumber } from '../lib/formatters';
import { AddressLink } from './AddressLink';

interface Props {
	data: Collateral[] | null;
	loading: boolean;
	error: string | null;
}

export function CollateralTable({ data, loading, error }: Props) {
	const columns: Column<Collateral>[] = [
		{
			header: { primary: 'COLLATERAL', secondary: 'ADDRESS' },
			width: '200px',
			format: (collateral): CellContent => ({
				primary: collateral.symbol,
				secondary: <AddressLink address={collateral.tokenAddress} className="font-mono" />,
        primaryClass: colors.text.primary,
			}),
		},
		{
			header: { primary: 'TOTAL LOCKED', secondary: 'POSITIONS' },
			width: '150px',
			align: 'right',
			format: (collateral): CellContent => ({
				primary: formatNumber(collateral.totalCollateral, collateral.decimals),
				secondary: `${collateral.positionCount} positions`,
			}),
		},
    {
			header: { primary: 'TVL (EUR)', secondary: 'PRICE (EUR)' },
			width: '180px',
			align: 'right',
			format: (collateral): CellContent => {
				const price = parseFloat(collateral.price);
				const totalLocked = bigintToNumber(collateral.totalCollateral, collateral.decimals);
				const tvl = isNaN(price) || price === 0 ? '-' : formatCurrency(totalLocked * price);
				return {
					primary: tvl,
					secondary: isNaN(price) || price === 0 ? '-' : formatCurrency(price),
				};
			},
		},
		{
			header: { primary: 'MINT LIMIT', secondary: 'AVAILABLE' },
			width: '180px',
			align: 'right',
			format: (collateral): CellContent => ({
				primary: formatNumber(collateral.totalLimit, 18, 0),
				secondary: formatNumber(collateral.totalAvailableForMinting, 18, 0),
				secondaryClass: collateral.totalAvailableForMinting !== '0' ? colors.success : undefined,
			}),
		},
	];

	return (
		<Table
			title="COLLATERAL SUMMARY"
			data={data}
			loading={loading}
			error={error}
			columns={columns}
			getRowKey={(collateral) => collateral.tokenAddress}
			shouldDimRow={(collateral) => collateral.totalLimit === '0'}
			emptyMessage="No collateral found"
		/>
	);
}

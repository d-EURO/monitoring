import type { Collateral } from '../types/index';
import { Alignment, Table } from './Table';
import type { Column, MultiLineCell } from './Table';
import { colors } from '../lib/theme';
import { formatNumber, bigintToNumber } from '../lib/formatters';
import { AddressLink } from './AddressLink';
import type { DataState } from '../lib/api.hook';

export function CollateralTable({ data, error }: DataState<Collateral[]>) {
	const columns: Column<Collateral>[] = [
		{
			header: { primary: 'COLLATERAL', secondary: 'ADDRESS' },
			format: (collateral): MultiLineCell => ({
				primary: collateral.symbol,
				secondary: <AddressLink address={collateral.tokenAddress} showKnownLabel={false} className="font-mono" />,
				primaryClass: colors.text.primary,
			}),
		},
		{
			header: { primary: 'TOTAL LOCKED', secondary: 'POSITIONS' },
			align: Alignment.RIGHT,
			format: (collateral): MultiLineCell => ({
				primary: formatNumber(collateral.totalCollateral, collateral.decimals),
				secondary: `${collateral.positionCount} positions`,
			}),
		},
		{
			header: { primary: 'TVL (EUR)', secondary: 'PRICE (EUR)' },
			align: Alignment.RIGHT,
			format: (collateral): MultiLineCell => {
				const price = parseFloat(collateral.price);
				const totalLocked = bigintToNumber(collateral.totalCollateral, collateral.decimals);
				const tvl = isNaN(price) || price === 0 ? '-' : formatNumber(totalLocked * price);
				return {
					primary: tvl,
					secondary: isNaN(price) || price === 0 ? '-' : formatNumber(price),
				};
			},
		},
		{
			header: { primary: 'MINT LIMIT', secondary: 'AVAILABLE' },
			align: Alignment.RIGHT,
			format: (collateral): MultiLineCell => ({
				primary: formatNumber(collateral.totalLimit, 18, 2),
				secondary: formatNumber(collateral.totalAvailableForMinting, 18, 2),
				secondaryClass: collateral.totalAvailableForMinting !== '0' ? colors.success : undefined,
			}),
		},
	];

	return (
		<Table
			title="COLLATERAL"
			data={data}
			error={error}
			columns={columns}
			getRowKey={(collateral) => collateral.tokenAddress}
			shouldDimRow={(collateral) => collateral.totalLimit === '0'}
			emptyMessage="No collateral found"
		/>
	);
}

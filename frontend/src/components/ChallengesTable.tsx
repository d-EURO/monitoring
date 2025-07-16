import type { Challenge, Collateral, Position } from '../types/index';
import { Table } from './Table';
import type { Column, CellContent } from './Table';
import { colors } from '../lib/theme';
import { formatAddress, formatNumber, formatDateTime, formatCountdown } from '../lib/formatters';
import { AddressLink } from './AddressLink';

interface Props {
	data: Challenge[] | null;
	loading: boolean;
	error: string | null;
	positionData: Position[] | null;
	collateralData: Collateral[] | null;
}

function getChallengeStatusColor(status: Challenge['status']): string {
	switch (status) {
		case 'OPENED':
			return colors.highlight;
		case 'PARTIALLY_AVERTED':
			return colors.highlight;
		case 'AVERTED':
			return colors.success;
		case 'AUCTION':
			return colors.highlight;
		case 'PARTIALLY_SUCCEEDED':
			return colors.highlight;
		case 'SUCCEEDED':
			return colors.success;
		default:
			return colors.text.secondary;
	}
}

export function ChallengesTable({ data, loading, error, positionData, collateralData }: Props) {
	const positionMap = new Map<string, Position>();
	const collateralMap = new Map<string, Collateral>();
	positionData?.forEach((p) => positionMap.set(p.address.toLowerCase(), p));
	collateralData?.forEach((c) => collateralMap.set(c.tokenAddress.toLowerCase(), c));

	const columns: Column<Challenge>[] = [
		{
			header: { primary: 'CHALLENGE', secondary: 'STATUS' },
			width: '140px',
			format: (challenge): CellContent => ({
				primary: `#${challenge.id}`,
				secondary: challenge.status,
				primaryClass: colors.text.primary,
				secondaryClass: getChallengeStatusColor(challenge.status),
			}),
		},
    {
			header: { primary: 'CHALLENGER', secondary: 'POSITION' },
			width: '180px',
			format: (challenge): CellContent => ({
				primary: formatAddress(challenge.challenger),
				secondary: formatAddress(challenge.position),
			}),
		},
		{
			header: { primary: 'AUCTION START', secondary: 'COUNTDOWN' },
			width: '160px',
			format: (challenge): CellContent => {
        const auctionStart = challenge.start / 1000 + challenge.phase;
				return {
					primary: formatDateTime(auctionStart),
					secondary: formatCountdown(auctionStart),
				};
			},
		},
		{
			header: { primary: 'COLLATERAL', secondary: 'BALANCE' },
			width: '150px',
			align: 'right',
			format: (challenge): CellContent => {
				const position = positionMap.get(challenge.position.toLowerCase());
				const collateral = collateralMap.get(position?.collateralAddress.toLowerCase() || '');
				const collateralBalance = position ? formatNumber(position.collateralBalance, collateral?.decimals || 18) : '-';
				return {
					primary: position ? <AddressLink address={position.collateralAddress} label={collateral?.symbol} /> : '-',
					secondary: collateralBalance,
				};
			},
		},
		{
			header: { primary: 'AMOUNT', secondary: 'REMAINING' },
			width: '150px',
			align: 'right',
			format: (challenge): CellContent => ({
				primary: formatNumber(challenge.initialSize),
				secondary: formatNumber(challenge.size),
        secondaryClass: challenge.size !== '0' ? colors.highlight : undefined,
			}),
		},
		{
			header: { primary: 'LIQ PRICE', secondary: 'BID' },
			width: '150px',
			align: 'right',
			format: (challenge): CellContent => ({
				primary: formatNumber(challenge.liqPrice),
				secondary: formatNumber(challenge.currentPrice),
			}),
		},
	];

	return (
		<Table
			title="ACTIVE CHALLENGES"
			data={data}
			loading={loading}
			error={error}
			columns={columns}
			getRowKey={(challenge) => challenge.id.toString()}
			shouldDimRow={(challenge) => ['AVERTED', 'SUCCEEDED'].includes(challenge.status)}
			emptyMessage="No active challenges"
		/>
	);
}

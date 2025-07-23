import type { Challenge, Collateral, Position } from '../types/index';
import { Alignment, Table } from './Table';
import type { Column, MultiLineCell } from './Table';
import { colors } from '../lib/theme';
import { formatAddress, formatNumber, formatDateTime, formatCountdown } from '../lib/formatters';
import { AddressLink } from './AddressLink';
import type { DataState } from '../lib/api.hook';

interface ChallengeTableProps {	
	data?: DataState<Challenge[]>;
	positionData?: Position[];
	collateralData?: Collateral[];
}


export function ChallengesTable({ data, positionData, collateralData }: ChallengeTableProps) {
	const positionMap = new Map<string, Position>();
	const collateralMap = new Map<string, Collateral>();
	positionData?.forEach((p) => positionMap.set(p.address.toLowerCase(), p));
	collateralData?.forEach((c) => collateralMap.set(c.tokenAddress.toLowerCase(), c));

	const columns: Column<Challenge>[] = [
		{
			header: { primary: 'CHALLENGE', secondary: 'STATUS' },
			format: (challenge): MultiLineCell => ({
				primary: `#${challenge.id}`,
				secondary: challenge.status,
				primaryClass: colors.text.primary,
				secondaryClass: getChallengeStatusColor(challenge.status),
			}),
		},
		{
			header: { primary: 'CHALLENGER', secondary: 'POSITION' },
			format: (challenge): MultiLineCell => ({
				primary: formatAddress(challenge.challenger),
				secondary: formatAddress(challenge.position),
			}),
		},
		{
			header: { primary: 'AUCTION START', secondary: 'COUNTDOWN' },
			format: (challenge): MultiLineCell => {
				const auctionStart = challenge.start / 1000 + challenge.phase;
				return {
					primary: formatDateTime(auctionStart),
					secondary: formatCountdown(auctionStart),
				};
			},
		},
		{
			header: { primary: 'COLLATERAL', secondary: 'BALANCE' },
			align: Alignment.RIGHT,
			format: (challenge): MultiLineCell => {
				const position = positionMap.get(challenge.position.toLowerCase());
				const collateral = collateralMap.get(position?.collateralAddress.toLowerCase() || '');
				const collateralBalance = position ? formatNumber(position.collateralBalance, collateral?.decimals || 18, 4) : '-';
				return {
					primary: position ? <AddressLink address={position.collateralAddress} label={collateral?.symbol} /> : '-',
					secondary: collateralBalance,
				};
			},
		},
		{
			header: { primary: 'AMOUNT', secondary: 'REMAINING' },
			align: Alignment.RIGHT,
			format: (challenge): MultiLineCell => {
				const position = positionMap.get(challenge.position.toLowerCase());
				const collateral = collateralMap.get(position?.collateralAddress.toLowerCase() || '');
				return {
					primary: formatNumber(challenge.initialSize, collateral?.decimals || 18, 4),
					secondary: formatNumber(challenge.size, collateral?.decimals || 18, 4),
					secondaryClass: challenge.size !== '0' ? colors.highlight : undefined,
				};
			},
		},
		{
			header: { primary: 'LIQ PRICE', secondary: 'BID' },
			align: Alignment.RIGHT,
			format: (challenge): MultiLineCell => {
				const position = positionMap.get(challenge.position.toLowerCase());
				const collateral = collateralMap.get(position?.collateralAddress.toLowerCase() || '');
				return {
					primary: formatNumber(challenge.liqPrice, 36 - (collateral?.decimals || 18), 2),
					secondary: formatNumber(challenge.currentPrice, 36 - (collateral?.decimals || 18), 2),
				};
			},
		},
	];

	return (
		<Table
			title="CHALLENGES"
			data={data?.data}
			error={data?.error}
			columns={columns}
			getRowKey={(challenge) => challenge.id.toString()}
			shouldDimRow={(challenge) => ['AVERTED', 'SUCCEEDED'].includes(challenge.status)}
			emptyMessage="No challenges found"
		/>
	);
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

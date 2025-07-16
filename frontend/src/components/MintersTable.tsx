import type { Minter } from '../types/index';
import { Table } from './Table';
import type { Column, CellContent } from './Table';
import { formatCountdown, formatDateTime, getStatusColor } from '../lib/formatters';
import { AddressLink } from './AddressLink';

interface Props {
	data: Minter[] | null;
	loading: boolean;
	error: string | null;
}

export function MintersTable({ data, loading, error }: Props) {
	const columns: Column<Minter>[] = [
		{
			header: { primary: 'MINTER', secondary: 'MESSAGE' },
			width: '250px',
			format: (minter): CellContent => ({
				primary: <AddressLink address={minter.minter} className="font-mono" />,
				secondary: minter.status,
				secondaryClass: getStatusColor(minter.status),
			}),
		},
		{
			header: { primary: 'APPLICATION', secondary: 'MESSAGE' },
			width: '150px',
			format: (minter): CellContent => ({
				primary: minter.applicationDate ? formatDateTime(new Date(minter.applicationDate).getTime() / 1000) : '-',
				secondary: minter.message ? minter.message.slice(0, 40) + (minter.message.length > 40 ? '...' : '') : '-',
			}),
		},
		{
			header: { primary: 'START', secondary: 'COUNTDOWN' },
			width: '150px',
			format: (minter): CellContent => {
				const startDate = new Date(minter.applicationDate).getTime() / 1000 + Number(minter.applicationPeriod);
				return {
					primary: formatDateTime(startDate),
					secondary: formatCountdown(startDate),
				};
			},
		},
	];

	return (
		<Table
			title="MINTERS"
			data={data}
			loading={loading}
			error={error}
			columns={columns}
			getRowKey={(minter) => minter.minter}
			emptyMessage="No minters found"
		/>
	);
}

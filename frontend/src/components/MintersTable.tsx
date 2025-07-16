import type { Bridge, Minter } from '../types/index';
import { Table } from './Table';
import type { Column, CellContent } from './Table';
import { bigintToNumber, formatCountdown, formatCurrency, formatDateTime, formatPercent, getStatusColor } from '../lib/formatters';
import { AddressLink } from './AddressLink';
import { colors } from '../lib/theme';

interface Props {
	data: Minter[] | null;
	loading: boolean;
	error: string | null;
  bridgeData: Bridge[] | null;
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

export function MintersTable({ data, loading, error, bridgeData }: Props) {
  const bridgeMap = new Map<string, Bridge>();
  bridgeData?.forEach((b) => bridgeMap.set(b.address.toLowerCase(), b));

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
			header: { primary: 'START', secondary: 'MESSAGE' },
			width: '150px',
			format: (minter): CellContent => {
				const startDate = new Date(minter.applicationDate).getTime() / 1000 + Number(minter.applicationPeriod);
        const hasStarted = startDate <= Date.now() / 1000;
				return {
					primary: hasStarted ? formatDateTime(startDate) : formatCountdown(startDate),
					secondary: minter.message ? minter.message.slice(0, 40) + (minter.message.length > 40 ? '...' : '') : '-',
				};
			},
		},
    {
          header: { primary: 'STATUS', secondary: 'EXPIRY' },
          width: '150px',
          align: 'right',
          format: (minter): CellContent => {
            const bridge = bridgeMap.get(minter.minter.toLowerCase());
            return {
              primary: isActive(bridge?.horizon) ? 'ACTIVE' : 'EXPIRED',
              secondary: bridge?.horizon ? formatCountdown(bridge?.horizon) : '-',
            };
          },
        },
        {
          header: { primary: 'MINTED', secondary: 'LIMIT' },
          width: '150px',
          align: 'right',
          format: (minter): CellContent => {
            const bridge = bridgeMap.get(minter.minter.toLowerCase());
            return {
              primary: bridge ? formatCurrency(bigintToNumber(bridge.minted, 18)) : '-',
              secondary: bridge ? formatCurrency(bigintToNumber(bridge.limit, 18)) : '-',
            };
          },
        },
        {
          header: 'UTIL. %',
          width: '120px',
          align: 'right',
          format: (minter) => {
            const bridge = bridgeMap.get(minter.minter.toLowerCase());
            const minted = bridge && Number(bigintToNumber(bridge?.minted, 18));
            const limit = bridge && Number(bigintToNumber(bridge?.limit, 18));
            const utilization = (limit && minted) ? (limit > 0 ? (minted * 10000) / (limit * 100) : 0) : undefined;
            return {
              primary: utilization !== undefined ? formatPercent(utilization) : '-',
              secondary: '-',
              primaryClass: utilization !== undefined ? getUtilizationColor(utilization) : undefined,
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
      shouldDimRow={(minter) => !isActive(bridgeMap.get(minter.minter.toLowerCase())?.horizon)}
			emptyMessage="No minters found"
		/>
	);
}

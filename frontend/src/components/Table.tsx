import { useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { colors, spacing, typography } from '../lib/theme';

export enum Alignment {
	LEFT = 'left',
	RIGHT = 'right',
	CENTER = 'center',
}

export interface MultiLineCell {
	primary: ReactNode;
	secondary?: ReactNode;
	primaryClass?: string;
	secondaryClass?: string;
}

export interface Column<T> {
	header: { primary: string; secondary?: string };
	align?: Alignment;
	format: (row: T) => ReactNode | MultiLineCell;
}

export function Table<T>({
	title,
	data,
	error,
	columns,
	getRowKey,
	shouldDimRow,
	emptyMessage = 'No data found',
}: {
	title: string;
	data?: T[];
	error?: string;
	columns: Column<T>[];
	getRowKey: (row: T) => string;
	shouldDimRow?: (row: T) => boolean;
	emptyMessage?: string;
}) {
	const [showDimmed, setShowDimmed] = useState(false);

	const filteredData = data && shouldDimRow ? (showDimmed ? data : data.filter((row) => !shouldDimRow(row))) : data;
	const dimmedCount = data && shouldDimRow ? data.filter((row) => shouldDimRow(row)).length : 0;

	return error ? (
		<EmptyTable title={title} message={`Error: ${error}`} />
	) : !filteredData?.length && (!dimmedCount || !showDimmed) ? (
		<EmptyTable title={title} message={emptyMessage} dimmedCount={dimmedCount} setShowDimmed={setShowDimmed} />
	) : (
		<div className={`${colors.background} ${colors.table.border} border rounded-xl`}>
			{/* table top bar */}
			<div
				className={`${spacing.cellPadding} ${colors.table.border} border-b rounded-t-xl ${colors.table.headerBg} flex items-center justify-between`}
			>
				<h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>
					{title} ({filteredData?.length})
				</h2>
				<button
					hidden={!dimmedCount}
					onClick={() => setShowDimmed(!showDimmed)}
					className={`text-xs ${colors.text.secondary} hover:text-gray-300 transition-colors cursor-pointer`}
				>
					{showDimmed ? `Hide ${dimmedCount}` : `Show ${dimmedCount} more`}
				</button>
			</div>

			{/* table */}
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						{/* headers */}
						<tr className={`${colors.table.border} border-b`}>
							{columns.map((column, index) => {
								const align = column.align || Alignment.LEFT;
								const alignClass = align === Alignment.RIGHT ? 'text-right' : align === Alignment.CENTER ? 'text-center' : 'text-left';
								return (
									<th
										key={index}
										className={`${spacing.cellPadding} ${alignClass} ${typography.tableHeader} ${colors.text.secondary}`}
									>
										<div className={spacing.compact}>
											<div>{column.header.primary}</div>
											{column.header.secondary && <div className={colors.text.muted}>{column.header.secondary}</div>}
										</div>
									</th>
								);
							})}
						</tr>
					</thead>
					{/* rows (body) */}
					<tbody>
						{filteredData?.map((row) => {
							const isDimmed = shouldDimRow?.(row) || false;
							const rowClass = isDimmed ? colors.table.rowDim : '';
							return (
								<tr key={getRowKey(row)} className={`${colors.table.border} border-b ${colors.table.rowHover} ${rowClass}`}>
									{columns.map((column, index) => (
										<td key={index} className={`${spacing.cellPadding} ${typography.value}`}>
											<CellContent column={column} row={row} isDimmed={isDimmed} />
										</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function EmptyTable({
	title,
	message,
	dimmedCount,
	setShowDimmed,
}: {
	title: string;
	message: string;
	dimmedCount?: number;
	setShowDimmed?: Dispatch<SetStateAction<boolean>>;
}) {
	return (
		<div className={`${colors.background} ${colors.table.border} border rounded-xl`}>
			<div
				className={`${spacing.cellPadding} ${colors.table.border} border-b rounded-t-xl ${colors.table.headerBg} flex items-center justify-between`}
			>
				<h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>{title}</h2>
				<button
					hidden={!dimmedCount || !setShowDimmed}
					onClick={() => setShowDimmed && setShowDimmed((prev) => !prev)}
					className={`text-xs ${colors.text.secondary} hover:text-gray-300 transition-colors cursor-pointer`}
				>
					Show {dimmedCount} more
				</button>
			</div>
			<div className={`${spacing.cellPadding} ${colors.text.secondary}`}>{message}</div>
		</div>
	);
}

function CellContent<T>({ column, row, isDimmed }: { column: Column<T>; row: T; isDimmed: boolean }): ReactNode {
	const content = column.format(row);
	const align = column.align || Alignment.LEFT;
	const alignClass = align === Alignment.RIGHT ? 'text-right' : align === Alignment.CENTER ? 'text-center' : 'text-left';
	if (content && typeof content === 'object' && 'primary' in content) {
		const cellContent = content as MultiLineCell;
		return (
			<div className={`${spacing.compact} ${alignClass}`}>
				<div className={cellContent.primaryClass || (isDimmed ? colors.text.secondary : colors.text.primary)}>
					{cellContent.primary}
				</div>
				{cellContent.secondary && (
					<div className={cellContent.secondaryClass || colors.text.secondary}>{cellContent.secondary}</div>
				)}
			</div>
		);
	}

	return <div className={`${alignClass} ${isDimmed ? colors.text.secondary : colors.text.primary}`}>{content}</div>;
}

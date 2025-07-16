import type { ReactNode } from 'react';
import { colors, spacing, typography } from '../lib/theme';

// Multi-line cell content
export interface CellContent {
  primary: ReactNode;
  secondary?: ReactNode;
  primaryClass?: string;
  secondaryClass?: string;
}

// Column definition
export interface Column<T> {
  header: string | { primary: string; secondary?: string };
  width?: string;
  align?: 'left' | 'right' | 'center';
  format: (row: T) => ReactNode | CellContent;
}

// Table props
export interface TableProps<T> {
  title: string;
  data: T[] | null;
  loading: boolean;
  error: string | null;
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  shouldDimRow?: (row: T) => boolean;
  emptyMessage?: string;
}

// Render a cell with potential multi-line content
function renderCell<T>(
  column: Column<T>,
  row: T,
  isDimmed: boolean
): ReactNode {
  const content = column.format(row);
  const align = column.align || 'left';
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  
  // Check if it's multi-line content
  if (content && typeof content === 'object' && 'primary' in content) {
    const cellContent = content as CellContent;
    return (
      <div className={`${spacing.compact} ${alignClass}`}>
        <div className={cellContent.primaryClass || (isDimmed ? colors.text.secondary : colors.text.primary)}>
          {cellContent.primary}
        </div>
        {cellContent.secondary && (
          <div className={cellContent.secondaryClass || colors.text.secondary}>
            {cellContent.secondary}
          </div>
        )}
      </div>
    );
  }
  
  // Simple content
  return (
    <div className={`${alignClass} ${isDimmed ? colors.text.secondary : colors.text.primary}`}>
      {content}
    </div>
  );
}

// Main Table component
export function Table<T>({
  title,
  data,
  loading,
  error,
  columns,
  getRowKey,
  shouldDimRow,
  emptyMessage = 'No data found'
}: TableProps<T>) {
  // Loading state
  if (loading) {
    return (
      <div className={`${colors.background} ${colors.table.border} border`}>
        <div className={`${spacing.cellPadding} ${colors.table.border} border-b`}>
          <h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>{title}</h2>
        </div>
        <div className={`${spacing.cellPadding} ${colors.text.secondary}`}>
          Loading...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${colors.background} ${colors.table.border} border`}>
        <div className={`${spacing.cellPadding} ${colors.table.border} border-b`}>
          <h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>{title}</h2>
        </div>
        <div className={`${spacing.cellPadding} ${colors.critical}`}>
          Error: {error}
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={`${colors.background} ${colors.table.border} border`}>
        <div className={`${spacing.cellPadding} ${colors.table.border} border-b`}>
          <h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>{title}</h2>
        </div>
        <div className={`${spacing.cellPadding} ${colors.text.secondary}`}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.background} ${colors.table.border} border`}>
      {/* Header */}
      <div className={`${spacing.cellPadding} ${colors.table.border} border-b ${colors.table.headerBg}`}>
        <h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>
          {title} ({data.length})
        </h2>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`${colors.table.border} border-b`}>
              {columns.map((column, index) => {
                const align = column.align || 'left';
                const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
                
                // Handle multi-line headers
                if (typeof column.header === 'object') {
                  return (
                    <th 
                      key={index} 
                      className={`${spacing.cellPadding} ${alignClass} ${typography.tableHeader} ${colors.text.secondary}`}
                      style={{ width: column.width }}
                    >
                      <div className={spacing.compact}>
                        <div>{column.header.primary}</div>
                        {column.header.secondary && (
                          <div className={colors.text.muted}>{column.header.secondary}</div>
                        )}
                      </div>
                    </th>
                  );
                }
                
                return (
                  <th 
                    key={index} 
                    className={`${spacing.cellPadding} ${alignClass} ${typography.tableHeader} ${colors.text.secondary}`}
                    style={{ width: column.width }}
                  >
                    {column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isDimmed = shouldDimRow?.(row) || false;
              const rowClass = isDimmed ? colors.table.rowDim : '';
              
              return (
                <tr 
                  key={getRowKey(row)} 
                  className={`${colors.table.border} border-b ${colors.table.rowHover} ${rowClass}`}
                >
                  {columns.map((column, index) => (
                    <td 
                      key={index} 
                      className={`${spacing.cellPadding} ${typography.value}`}
                    >
                      {renderCell(column, row, isDimmed)}
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
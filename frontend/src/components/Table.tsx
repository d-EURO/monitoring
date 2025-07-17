import { useState } from 'react';
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
  const [showDimmed, setShowDimmed] = useState(false);
  
  // Filter data based on showDimmed state
  const filteredData = data && shouldDimRow
    ? (showDimmed ? data : data.filter(row => !shouldDimRow(row)))
    : data;
  
  // Count dimmed rows
  const dimmedCount = data && shouldDimRow
    ? data.filter(row => shouldDimRow(row)).length
    : 0;
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

  // Empty state - but check if we have dimmed items that are hidden
  if (!filteredData || filteredData.length === 0) {
    // If we have dimmed items that are hidden, show the table with toggle button
    if (dimmedCount > 0 && !showDimmed) {
      return (
        <div className={`${colors.background} ${colors.table.border} border rounded-xl`}>
          <div className={`${spacing.cellPadding} ${colors.table.border} border-b rounded-t-xl ${colors.table.headerBg} flex items-center justify-between`}>
            <h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>
              {title} (0)
            </h2>
            <button
              onClick={() => setShowDimmed(!showDimmed)}
              className={`text-xs ${colors.text.secondary} hover:text-gray-300 transition-colors cursor-pointer`}
            >
              Show {dimmedCount} more
            </button>
          </div>
          <div className={`${spacing.cellPadding} ${colors.text.secondary}`}>
            No active items
          </div>
        </div>
      );
    }
    
    // Otherwise show regular empty state
    return (
      <div className={`${colors.background} ${colors.table.border} border rounded-xl`}>
        <div className={`${spacing.cellPadding} ${colors.table.border} border-b rounded-t-xl`}>
          <h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>{title}</h2>
        </div>
        <div className={`${spacing.cellPadding} ${colors.text.secondary}`}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.background} ${colors.table.border} border rounded-xl`}>
      {/* Header */}
      <div className={`${spacing.cellPadding} ${colors.table.border} border-b rounded-t-xl ${colors.table.headerBg} flex items-center justify-between`}>
        <h2 className={`text-sm ${typography.tableHeader} ${colors.text.primary}`}>
          {title} ({filteredData.length})
        </h2>
        {dimmedCount > 0 && (
          <button
            onClick={() => setShowDimmed(!showDimmed)}
            className={`text-xs ${colors.text.secondary} hover:text-gray-300 transition-colors cursor-pointer`}
          >
            {showDimmed ? `Hide ${dimmedCount}` : `Show ${dimmedCount} more`}
          </button>
        )}
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
            {filteredData.map((row) => {
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
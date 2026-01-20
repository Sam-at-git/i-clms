import { ReactNode } from 'react';

interface Column<T> {
  key: keyof T;
  title: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyMessage = '暂无数据',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyMessage}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} style={styles.th}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              style={{ ...styles.tr, ...(onRowClick && styles.trClickable) }}
            >
              {columns.map((column, colIndex) => {
                const value = row[column.key as string];
                return (
                  <td key={colIndex} style={styles.td}>
                    {column.render ? column.render(value, row) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    overflowX: 'auto' as const,
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  trClickable: {
    cursor: 'pointer',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: '14px',
    color: '#9ca3af',
  },
};

export default DataTable;

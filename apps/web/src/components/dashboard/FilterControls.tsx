import { useState } from 'react';

export type DateRange = 'month' | 'quarter' | 'year' | 'custom';

interface FilterControlsProps {
  onFilterChange?: (filters: FilterState) => void;
  availableDepartments?: Array<{ id: string; name: string }>;
  availableYears?: number[];
}

export interface FilterState {
  department?: string;
  year?: number;
  dateRange?: DateRange;
  customStart?: string;
  customEnd?: string;
  refreshInterval?: number;
}

export function FilterControls({
  onFilterChange,
  availableDepartments,
  availableYears,
}: FilterControlsProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'month',
    refreshInterval: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    // TODO: Implement export functionality
  };

  const handleRefresh = () => {
    onFilterChange?.(filters);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={styles.toggleButton}
        >
          <span style={styles.filterIcon}>⚙</span>
          <span>筛选与视图</span>
          <span style={styles.activeCount}>
            {Object.values(filters).filter(Boolean).length}
          </span>
        </button>
        <div style={styles.headerActions}>
          <button onClick={handleRefresh} style={styles.refreshButton} title="刷新数据">
            🔄
          </button>
          <button onClick={() => handleExport('excel')} style={styles.exportButton} title="导出Excel">
            📊 导出
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={styles.filters}>
          {/* Department Filter */}
          {availableDepartments && availableDepartments.length > 0 && (
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>部门</label>
              <select
                value={filters.department || ''}
                onChange={(e) => handleFilterChange('department', e.target.value || undefined)}
                style={styles.select}
              >
                <option value="">全部部门</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year Filter */}
          {availableYears && availableYears.length > 0 && (
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>年份</label>
              <select
                value={filters.year?.toString() || ''}
                onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                style={styles.select}
              >
                <option value="">全部年份</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>周期</label>
            <select
              value={filters.dateRange || 'month'}
              onChange={(e) => handleFilterChange('dateRange', e.target.value as DateRange)}
              style={styles.select}
            >
              <option value="month">按月</option>
              <option value="quarter">按季度</option>
              <option value="year">按年</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>自定义范围</label>
              <div style={styles.dateInputs}>
                <input
                  type="date"
                  value={filters.customStart || ''}
                  onChange={(e) => handleFilterChange('customStart', e.target.value)}
                  style={styles.dateInput}
                />
                <span style={styles.dateSeparator}>至</span>
                <input
                  type="date"
                  value={filters.customEnd || ''}
                  onChange={(e) => handleFilterChange('customEnd', e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            </div>
          )}

          {/* Refresh Interval */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>自动刷新</label>
            <select
              value={filters.refreshInterval?.toString() || '0'}
              onChange={(e) => handleFilterChange('refreshInterval', parseInt(e.target.value))}
              style={styles.select}
            >
              <option value="0">关闭</option>
              <option value="30000">30秒</option>
              <option value="60000">1分钟</option>
              <option value="300000">5分钟</option>
            </select>
          </div>

          {/* Actions */}
          <div style={styles.filterActions}>
            <button onClick={() => setFilters({ dateRange: 'month', refreshInterval: 0 })} style={styles.clearButton}>
              清除筛选
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  filterIcon: {
    fontSize: '16px',
  },
  activeCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#3b82f6',
    borderRadius: '10px',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  refreshButton: {
    padding: '8px 12px',
    fontSize: '16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  exportButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  dateInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  dateSeparator: {
    fontSize: '14px',
    color: '#6b7280',
  },
  filterActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  clearButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default FilterControls;

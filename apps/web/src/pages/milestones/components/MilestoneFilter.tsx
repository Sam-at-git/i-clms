interface MilestoneFilterProps {
  filters: {
    status: string;
    contractId: string;
    searchTerm: string;
  };
  onFilterChange: (filters: Record<string, string>) => void;
  MilestoneStatus?: Record<string, string>;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待开始',
  IN_PROGRESS: '进行中',
  DELIVERED: '已交付',
  ACCEPTED: '已验收',
  REJECTED: '被拒绝',
};

export function MilestoneFilter({ filters, onFilterChange }: MilestoneFilterProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ status: e.target.value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ searchTerm: e.target.value });
  };

  const handleClearFilters = () => {
    onFilterChange({ status: '', searchTerm: '' });
  };

  const hasActiveFilters = filters.status !== '' || filters.searchTerm !== '';

  return (
    <div style={styles.container}>
      <div style={styles.filterRow}>
        {/* Search */}
        <div style={styles.filterGroup}>
          <label style={styles.label}>搜索</label>
          <input
            type="text"
            value={filters.searchTerm}
            onChange={handleSearchChange}
            placeholder="里程碑名称、合同、客户..."
            style={styles.input}
          />
        </div>

        {/* Status Filter */}
        <div style={styles.filterGroup}>
          <label style={styles.label}>状态</label>
          <select
            value={filters.status}
            onChange={handleStatusChange}
            style={styles.select}
          >
            <option value="">全部状态</option>
            {Object.keys(STATUS_LABELS).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div style={styles.filterGroup}>
            <label style={styles.label}>&nbsp;</label>
            <button onClick={handleClearFilters} style={styles.clearButton}>
              清除筛选
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div style={styles.activeFilters}>
          {filters.status && (
            <span style={styles.activeFilterTag}>
              状态: {STATUS_LABELS[filters.status]}
              <button
                onClick={() => onFilterChange({ status: '' })}
                style={styles.removeFilterBtn}
              >
                ×
              </button>
            </span>
          )}
          {filters.searchTerm && (
            <span style={styles.activeFilterTag}>
              搜索: {filters.searchTerm}
              <button
                onClick={() => onFilterChange({ searchTerm: '' })}
                style={styles.removeFilterBtn}
              >
                ×
              </button>
            </span>
          )}
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
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    minWidth: '200px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    minWidth: '150px',
    outline: 'none',
    cursor: 'pointer',
  },
  clearButton: {
    padding: '8px 16px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },
  activeFilterTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  removeFilterBtn: {
    padding: '0',
    fontSize: '16px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    lineHeight: 1,
  },
};

export default MilestoneFilter;

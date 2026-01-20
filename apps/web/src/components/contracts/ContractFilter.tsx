import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useContractFilters } from '../../lib/filter-hooks';

const GET_CUSTOMERS = gql`
  query GetCustomers {
    customers {
      id
      name
      shortName
    }
  }
`;

const GET_DEPARTMENTS = gql`
  query GetDepartments {
    departments {
      id
      name
      code
    }
  }
`;

const CONTRACT_TYPES = [
  { value: 'STAFF_AUGMENTATION', label: '人力框架' },
  { value: 'PROJECT_OUTSOURCING', label: '项目外包' },
  { value: 'PRODUCT_SALES', label: '产品购销' },
];

const CONTRACT_STATUSES = [
  { value: 'DRAFT', label: '草拟' },
  { value: 'PENDING_APPROVAL', label: '审批中' },
  { value: 'ACTIVE', label: '已生效' },
  { value: 'EXECUTING', label: '执行中' },
  { value: 'COMPLETED', label: '已完结' },
  { value: 'TERMINATED', label: '已终止' },
  { value: 'EXPIRED', label: '已过期' },
];

interface ContractFilterProps {
  onFilterChange?: (filters: ReturnType<typeof useContractFilters>['filters']) => void;
}

export function ContractFilter({ onFilterChange }: ContractFilterProps) {
  const { filters, updateFilter, clearFilters, hasActiveFilters, getFilterCount } =
    useContractFilters();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: customersData } = useQuery(GET_CUSTOMERS);
  const { data: departmentsData } = useQuery(GET_DEPARTMENTS);

  const customers = (customersData as any)?.customers || [];
  const departments = (departmentsData as any)?.departments || [];

  const handleTypeChange = (typeValue: string) => {
    const currentTypes = filters.types || [];
    const newTypes = currentTypes.includes(typeValue)
      ? currentTypes.filter((t) => t !== typeValue)
      : [...currentTypes, typeValue];

    updateFilter('types', newTypes.length > 0 ? newTypes : undefined);
    onFilterChange?.({ ...filters, types: newTypes.length > 0 ? newTypes : undefined });
  };

  const handleStatusChange = (statusValue: string) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = currentStatuses.includes(statusValue)
      ? currentStatuses.filter((s) => s !== statusValue)
      : [...currentStatuses, statusValue];

    updateFilter('statuses', newStatuses.length > 0 ? newStatuses : undefined);
    onFilterChange?.({ ...filters, statuses: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const handleDateRangeChange = (field: 'signedAfter' | 'signedBefore', value: string) => {
    updateFilter(field, value || undefined);
    onFilterChange?.({ ...filters, [field]: value || undefined });
  };

  const handleAmountRangeChange = (field: 'minAmount' | 'maxAmount', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    updateFilter(field, numValue);
    onFilterChange?.({ ...filters, [field]: numValue });
  };

  const handleClearAll = () => {
    clearFilters();
    onFilterChange?.({});
  };

  const filterCount = getFilterCount();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={styles.toggleButton}
          >
            <span style={styles.filterIcon}>⚙</span>
            <span>筛选</span>
            {filterCount > 0 && (
              <span style={styles.filterCount}>{filterCount}</span>
            )}
          </button>
        </div>
        {hasActiveFilters() && (
          <button onClick={handleClearAll} style={styles.clearButton}>
            清除筛选
          </button>
        )}
      </div>

      {isExpanded && (
        <div style={styles.filters}>
          {/* 合同类型 */}
          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>合同类型</label>
            <div style={styles.checkboxGroup}>
              {CONTRACT_TYPES.map((type) => (
                <label key={type.value} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.types?.includes(type.value) || false}
                    onChange={() => handleTypeChange(type.value)}
                    style={styles.checkbox}
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 合同状态 */}
          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>合同状态</label>
            <div style={styles.checkboxGroup}>
              {CONTRACT_STATUSES.map((status) => (
                <label key={status.value} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.statuses?.includes(status.value) || false}
                    onChange={() => handleStatusChange(status.value)}
                    style={styles.checkbox}
                  />
                  <span>{status.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 客户筛选 */}
          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>客户</label>
            <select
              value={filters.customerId || ''}
              onChange={(e) => {
                updateFilter('customerId', e.target.value || undefined);
                onFilterChange?.({ ...filters, customerId: e.target.value || undefined });
              }}
              style={styles.select}
            >
              <option value="">全部客户</option>
              {customers.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.shortName || customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* 部门筛选 */}
          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>部门</label>
            <select
              value={filters.departmentId || ''}
              onChange={(e) => {
                updateFilter('departmentId', e.target.value || undefined);
                onFilterChange?.({ ...filters, departmentId: e.target.value || undefined });
              }}
              style={styles.select}
            >
              <option value="">全部部门</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* 签订日期范围 */}
          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>签订日期</label>
            <div style={styles.dateRange}>
              <input
                type="date"
                value={filters.signedAfter || ''}
                onChange={(e) => handleDateRangeChange('signedAfter', e.target.value)}
                style={styles.dateInput}
                placeholder="开始日期"
              />
              <span style={styles.dateSeparator}>至</span>
              <input
                type="date"
                value={filters.signedBefore || ''}
                onChange={(e) => handleDateRangeChange('signedBefore', e.target.value)}
                style={styles.dateInput}
                placeholder="结束日期"
              />
            </div>
          </div>

          {/* 金额范围 */}
          <div style={styles.filterSection}>
            <label style={styles.filterLabel}>金额范围 (¥)</label>
            <div style={styles.amountRange}>
              <input
                type="number"
                value={filters.minAmount || ''}
                onChange={(e) => handleAmountRangeChange('minAmount', e.target.value)}
                style={styles.amountInput}
                placeholder="最小金额"
                min="0"
                step="10000"
              />
              <span style={styles.amountSeparator}>-</span>
              <input
                type="number"
                value={filters.maxAmount || ''}
                onChange={(e) => handleAmountRangeChange('maxAmount', e.target.value)}
                style={styles.amountInput}
                placeholder="最大金额"
                min="0"
                step="10000"
              />
            </div>
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
  headerLeft: {
    display: 'flex',
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
  filterCount: {
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
  clearButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  filters: {
    marginTop: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#4b5563',
    cursor: 'pointer',
  },
  checkbox: {
    margin: 0,
    cursor: 'pointer',
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
  dateRange: {
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
  amountRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  amountInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  amountSeparator: {
    fontSize: '14px',
    color: '#6b7280',
  },
};

export default ContractFilter;

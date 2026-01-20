import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useContractFilters, ContractFilters } from '../../lib/filter-hooks';

const GET_CUSTOMERS = gql`
  query GetCustomersBasic {
    customers {
      items {
        id
        name
        shortName
      }
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

export type LogicalOperator = 'AND' | 'OR';

export interface SearchCondition {
  id: string;
  field: keyof ContractFilters | 'amountRange';
  operator: 'equals' | 'contains' | 'in' | 'between' | 'greaterThan' | 'lessThan';
  value: any;
  label: string;
}

export interface SearchConditionGroup {
  id: string;
  operator: LogicalOperator;
  conditions: SearchCondition[];
}

export interface SavedSearch {
  id: string;
  name: string;
  groups: SearchConditionGroup[];
  createdAt: number;
}

const SAVED_SEARCHES_KEY = 'advanced_search_saved';

// Field definitions for the advanced search
const FIELD_DEFINITIONS = [
  { value: 'search', label: '关键词', type: 'text', operators: ['contains', 'equals'] },
  { value: 'types', label: '合同类型', type: 'multiSelect', options: CONTRACT_TYPES, operators: ['in'] },
  { value: 'statuses', label: '合同状态', type: 'multiSelect', options: CONTRACT_STATUSES, operators: ['in'] },
  { value: 'customerId', label: '客户', type: 'select', operators: ['equals'] },
  { value: 'departmentId', label: '部门', type: 'select', operators: ['equals'] },
  { value: 'signedAfter', label: '签订日期起', type: 'date', operators: ['greaterThan'] },
  { value: 'signedBefore', label: '签订日期止', type: 'date', operators: ['lessThan'] },
  { value: 'amountRange', label: '金额范围', type: 'range', operators: ['between'] },
] as const;

interface AdvancedSearchPanelProps {
  onSearch?: (filters: ContractFilters) => void;
}

export function AdvancedSearchPanel({ onSearch }: AdvancedSearchPanelProps) {
  const { filters, updateFilter, clearFilters } = useContractFilters();
  const [isExpanded, setIsExpanded] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: customersData } = useQuery(GET_CUSTOMERS);
  const { data: departmentsData } = useQuery(GET_DEPARTMENTS);

  const customers = (customersData as any)?.customers?.items || [];
  const departments = (departmentsData as any)?.departments || [];

  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_SEARCHES_KEY);
      if (stored) {
        const parsed: SavedSearch[] = JSON.parse(stored);
        setSavedSearches(parsed);
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }, []);

  // Save searches to localStorage
  const saveSearchesToStorage = (searches: SavedSearch[]) => {
    try {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
    } catch (error) {
      // Ignore localStorage errors
    }
  };

  // Apply current filters to contract search
  const handleApplySearch = () => {
    onSearch?.(filters);
    setIsExpanded(false);
  };

  // Clear all filters
  const handleClearAll = () => {
    clearFilters();
    onSearch?.({});
  };

  // Save current search
  const handleSaveSearch = () => {
    if (!saveName.trim()) return;

    const groups = convertFiltersToGroups(filters);
    const newSavedSearch: SavedSearch = {
      id: `search_${Date.now()}`,
      name: saveName.trim(),
      groups,
      createdAt: Date.now(),
    };

    const updated = [...savedSearches, newSavedSearch];
    setSavedSearches(updated);
    saveSearchesToStorage(updated);
    setSaveName('');
    setSaveDialogOpen(false);
  };

  // Load a saved search
  const handleLoadSearch = (saved: SavedSearch) => {
    const convertedFilters = convertGroupsToFilters(saved.groups);
    // Apply all filters
    Object.entries(convertedFilters).forEach(([key, value]) => {
      updateFilter(key as keyof ContractFilters, value);
    });
    onSearch?.(convertedFilters);
    setShowSavedSearches(false);
    setIsExpanded(false);
  };

  // Delete a saved search
  const handleDeleteSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    saveSearchesToStorage(updated);
  };

  // Export saved searches
  const handleExportSearches = () => {
    const dataStr = JSON.stringify(savedSearches, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saved-searches-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import saved searches
  const handleImportSearches = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported: SavedSearch[] = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            const merged = [...savedSearches];
            imported.forEach((item) => {
              if (!merged.find((s) => s.id === item.id)) {
                merged.push(item);
              }
            });
            setSavedSearches(merged);
            saveSearchesToStorage(merged);
          }
        } catch (error) {
          // Ignore JSON parse errors
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Convert current filters to condition groups
  const convertFiltersToGroups = (currentFilters: ContractFilters): SearchConditionGroup[] => {
    const groups: SearchConditionGroup[] = [];
    const conditions: SearchCondition[] = [];

    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value) && value.length === 0) return;

      const fieldDef = FIELD_DEFINITIONS.find((f) => f.value === key);
      if (!fieldDef) return;

      conditions.push({
        id: `cond_${Date.now()}_${Math.random()}`,
        field: key as keyof ContractFilters,
        operator: fieldDef.operators[0] as any,
        value,
        label: fieldDef.label,
      });
    });

    if (conditions.length > 0) {
      groups.push({
        id: `group_${Date.now()}`,
        operator: 'AND',
        conditions,
      });
    }

    return groups;
  };

  // Convert condition groups back to filters
  const convertGroupsToFilters = (groups: SearchConditionGroup[]): ContractFilters => {
    const result: ContractFilters = {};

    groups.forEach((group) => {
      group.conditions.forEach((condition) => {
        const key = condition.field;
        // For amountRange, split into minAmount and maxAmount
        if (key === 'amountRange' && typeof condition.value === 'object') {
          if (condition.value.min !== undefined) {
            result.minAmount = condition.value.min;
          }
          if (condition.value.max !== undefined) {
            result.maxAmount = condition.value.max;
          }
        } else {
          result[key] = condition.value;
        }
      });
    });

    return result;
  };

  // Get active filter count
  const getActiveCount = () => {
    let count = 0;
    Object.values(filters).forEach(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== '' &&
        (Array.isArray(value) ? value.length > 0 : true) &&
        count++
    );
    return count;
  };

  const activeCount = getActiveCount();

  return (
    <div style={styles.container} ref={containerRef}>
      {/* Header with toggle and actions */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={styles.toggleButton}
            type="button"
          >
            <span style={styles.icon}>🔍</span>
            <span>高级搜索</span>
            {activeCount > 0 && <span style={styles.badge}>{activeCount}</span>}
          </button>
        </div>

        {isExpanded && (
          <div style={styles.headerActions}>
            <button onClick={handleClearAll} style={styles.clearButton} type="button">
              清除
            </button>
            <button
              onClick={() => setSaveDialogOpen(true)}
              style={styles.saveButton}
              type="button"
              disabled={activeCount === 0}
            >
              保存
            </button>
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              style={styles.savedButton}
              type="button"
            >
              已保存 ({savedSearches.length})
            </button>
            <button onClick={handleApplySearch} style={styles.applyButton} type="button">
              应用
            </button>
          </div>
        )}
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div style={styles.panel}>
          {/* Save Dialog */}
          {saveDialogOpen && (
            <div style={styles.dialog}>
              <div style={styles.dialogContent}>
                <h4 style={styles.dialogTitle}>保存搜索</h4>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="输入搜索名称..."
                  style={styles.dialogInput}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveSearch();
                    if (e.key === 'Escape') setSaveDialogOpen(false);
                  }}
                />
                <div style={styles.dialogActions}>
                  <button
                    onClick={() => setSaveDialogOpen(false)}
                    style={styles.dialogCancelButton}
                    type="button"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveSearch}
                    style={styles.dialogConfirmButton}
                    disabled={!saveName.trim()}
                    type="button"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saved Searches Dropdown */}
          {showSavedSearches && (
            <div style={styles.savedDropdown}>
              <div style={styles.savedHeader}>
                <span style={styles.savedTitle}>已保存的搜索</span>
                <div style={styles.savedActions}>
                  <button onClick={handleImportSearches} style={styles.iconButton} type="button" title="导入">
                    📥
                  </button>
                  <button onClick={handleExportSearches} style={styles.iconButton} type="button" title="导出" disabled={savedSearches.length === 0}>
                    📤
                  </button>
                </div>
              </div>
              {savedSearches.length === 0 ? (
                <div style={styles.empty}>暂无保存的搜索</div>
              ) : (
                <ul style={styles.savedList}>
                  {savedSearches.map((saved) => (
                    <li key={saved.id} style={styles.savedItem}>
                      <div style={styles.savedItemContent}>
                        <span style={styles.savedName}>{saved.name}</span>
                        <span style={styles.savedDate}>
                          {new Date(saved.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div style={styles.savedItemActions}>
                        <button
                          onClick={() => handleLoadSearch(saved)}
                          style={styles.loadButton}
                          type="button"
                        >
                          加载
                        </button>
                        <button
                          onClick={() => handleDeleteSearch(saved.id)}
                          style={styles.deleteButton}
                          type="button"
                        >
                          删除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Current Active Filters Display */}
          <div style={styles.conditionsDisplay}>
            <div style={styles.conditionsHeader}>
              <span style={styles.conditionsTitle}>当前筛选条件</span>
              {activeCount > 0 && (
                <button onClick={handleClearAll} style={styles.clearLink} type="button">
                  清除全部
                </button>
              )}
            </div>

            {activeCount === 0 ? (
              <div style={styles.empty}>暂无筛选条件，请从下方添加</div>
            ) : (
              <div style={styles.activeFilters}>
                {filters.search && (
                  <div style={styles.filterTag}>
                    <span style={styles.filterTagLabel}>关键词:</span>
                    <span style={styles.filterValue}>{filters.search}</span>
                    <button
                      onClick={() => updateFilter('search', undefined)}
                      style={styles.removeTag}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {filters.types?.map((type) => (
                  <div key={type} style={styles.filterTag}>
                    <span style={styles.filterTagLabel}>类型:</span>
                    <span style={styles.filterValue}>
                      {CONTRACT_TYPES.find((t) => t.value === type)?.label}
                    </span>
                    <button
                      onClick={() => {
                        const newTypes = filters.types?.filter((t) => t !== type);
                        updateFilter('types', newTypes?.length ? newTypes : undefined);
                      }}
                      style={styles.removeTag}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {filters.statuses?.map((status) => (
                  <div key={status} style={styles.filterTag}>
                    <span style={styles.filterTagLabel}>状态:</span>
                    <span style={styles.filterValue}>
                      {CONTRACT_STATUSES.find((s) => s.value === status)?.label}
                    </span>
                    <button
                      onClick={() => {
                        const newStatuses = filters.statuses?.filter((s) => s !== status);
                        updateFilter('statuses', newStatuses?.length ? newStatuses : undefined);
                      }}
                      style={styles.removeTag}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {filters.customerId && (
                  <div style={styles.filterTag}>
                    <span style={styles.filterTagLabel}>客户:</span>
                    <span style={styles.filterValue}>
                      {customers.find((c: any) => c.id === filters.customerId)?.shortName ||
                      customers.find((c: any) => c.id === filters.customerId)?.name}
                    </span>
                    <button
                      onClick={() => updateFilter('customerId', undefined)}
                      style={styles.removeTag}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {filters.departmentId && (
                  <div style={styles.filterTag}>
                    <span style={styles.filterTagLabel}>部门:</span>
                    <span style={styles.filterValue}>
                      {departments.find((d: any) => d.id === filters.departmentId)?.name}
                    </span>
                    <button
                      onClick={() => updateFilter('departmentId', undefined)}
                      style={styles.removeTag}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {filters.signedAfter && (
                  <div style={styles.filterTag}>
                    <span style={styles.filterTagLabel}>签订日期:</span>
                    <span style={styles.filterValue}>≥ {filters.signedAfter}</span>
                    <button
                      onClick={() => updateFilter('signedAfter', undefined)}
                      style={styles.removeTag}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {filters.signedBefore && (
                  <div style={styles.filterTag}>
                    <span style={styles.filterTagLabel}>签订日期:</span>
                    <span style={styles.filterValue}>≤ {filters.signedBefore}</span>
                    <button
                      onClick={() => updateFilter('signedBefore', undefined)}
                      style={styles.removeTag}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {(filters.minAmount !== undefined || filters.maxAmount !== undefined) && (
                  <div style={styles.filterTag}>
                    <span style={styles.filterTagLabel}>金额:</span>
                    <span style={styles.filterValue}>
                      {filters.minAmount !== undefined ? `¥${filters.minAmount.toLocaleString()}` : '¥0'}
                      {' - '}
                      {filters.maxAmount !== undefined ? `¥${filters.maxAmount.toLocaleString()}` : '无限制'}
                    </span>
                    <button
                      onClick={() => {
                        updateFilter('minAmount', undefined);
                        updateFilter('maxAmount', undefined);
                      }}
                      style={styles.removeTag}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Options Grid */}
          <div style={styles.filtersGrid}>
            {/* Keyword Search */}
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>关键词搜索</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value || undefined)}
                placeholder="合同号、名称、客户..."
                style={styles.textInput}
              />
            </div>

            {/* Contract Types */}
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>合同类型</label>
              <div style={styles.checkboxGroup}>
                {CONTRACT_TYPES.map((type) => (
                  <label key={type.value} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.types?.includes(type.value) || false}
                      onChange={() => {
                        const current = filters.types || [];
                        const updated = current.includes(type.value)
                          ? current.filter((t) => t !== type.value)
                          : [...current, type.value];
                        updateFilter('types', updated.length ? updated : undefined);
                      }}
                      style={styles.checkbox}
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contract Statuses */}
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>合同状态</label>
              <div style={styles.checkboxGroup}>
                {CONTRACT_STATUSES.map((status) => (
                  <label key={status.value} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={filters.statuses?.includes(status.value) || false}
                      onChange={() => {
                        const current = filters.statuses || [];
                        const updated = current.includes(status.value)
                          ? current.filter((s) => s !== status.value)
                          : [...current, status.value];
                        updateFilter('statuses', updated.length ? updated : undefined);
                      }}
                      style={styles.checkbox}
                    />
                    <span>{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Customer Filter */}
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>客户</label>
              <select
                value={filters.customerId || ''}
                onChange={(e) => updateFilter('customerId', e.target.value || undefined)}
                style={styles.selectInput}
              >
                <option value="">全部客户</option>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.shortName || customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>部门</label>
              <select
                value={filters.departmentId || ''}
                onChange={(e) => updateFilter('departmentId', e.target.value || undefined)}
                style={styles.selectInput}
              >
                <option value="">全部部门</option>
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>签订日期范围</label>
              <div style={styles.dateRange}>
                <input
                  type="date"
                  value={filters.signedAfter || ''}
                  onChange={(e) => updateFilter('signedAfter', e.target.value || undefined)}
                  style={styles.dateInput}
                />
                <span style={styles.dateSeparator}>至</span>
                <input
                  type="date"
                  value={filters.signedBefore || ''}
                  onChange={(e) => updateFilter('signedBefore', e.target.value || undefined)}
                  style={styles.dateInput}
                />
              </div>
            </div>

            {/* Amount Range */}
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>金额范围 (¥)</label>
              <div style={styles.amountRange}>
                <input
                  type="number"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    updateFilter('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="最小"
                  style={styles.amountInput}
                  min="0"
                  step="10000"
                />
                <span style={styles.amountSeparator}>-</span>
                <input
                  type="number"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    updateFilter('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="最大"
                  style={styles.amountInput}
                  min="0"
                  step="10000"
                />
              </div>
            </div>
          </div>

          {/* Logic Operator Info */}
          <div style={styles.logicInfo}>
            <span style={styles.logicIcon}>ℹ️</span>
            <span style={styles.logicText}>
              多个筛选条件之间使用 <strong>AND</strong> 逻辑组合，所有条件必须同时满足
            </span>
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
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
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
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  icon: {
    fontSize: '16px',
  },
  badge: {
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
    alignItems: 'center',
    gap: '8px',
  },
  clearButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  savedButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  applyButton: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  panel: {
    position: 'relative' as const,
    padding: '16px',
  },
  dialog: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  dialogContent: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
  dialogTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
  },
  dialogInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginBottom: '16px',
    outline: 'none',
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  dialogCancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  dialogConfirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  savedDropdown: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    width: '280px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    zIndex: 20,
    maxHeight: '300px',
    overflow: 'hidden',
  },
  savedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  savedTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  savedActions: {
    display: 'flex',
    gap: '4px',
  },
  iconButton: {
    padding: '4px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#9ca3af',
  },
  savedList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    maxHeight: '240px',
    overflowY: 'auto' as const,
  },
  savedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #f3f4f6',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  savedItemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  savedName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  savedDate: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  savedItemActions: {
    display: 'flex',
    gap: '4px',
  },
  loadButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  conditionsDisplay: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  conditionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  conditionsTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
  },
  clearLink: {
    padding: '2px 8px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  activeFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  filterTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    fontSize: '13px',
  },
  filterTagLabel: {
    color: '#6b7280',
    fontSize: '12px',
  },
  filterValue: {
    color: '#374151',
    fontWeight: 500,
  },
  removeTag: {
    padding: '0',
    fontSize: '12px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  textInput: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  selectInput: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#4b5563',
    cursor: 'pointer',
  },
  checkbox: {
    margin: 0,
    cursor: 'pointer',
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dateInput: {
    flex: 1,
    padding: '8px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  dateSeparator: {
    fontSize: '13px',
    color: '#6b7280',
  },
  amountRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  amountInput: {
    flex: 1,
    padding: '8px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  amountSeparator: {
    fontSize: '13px',
    color: '#6b7280',
  },
  logicInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '10px 12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '6px',
  },
  logicIcon: {
    fontSize: '14px',
  },
  logicText: {
    fontSize: '13px',
    color: '#1e40af',
  },
};

export default AdvancedSearchPanel;

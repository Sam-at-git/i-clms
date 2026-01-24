import { useState, useCallback } from 'react';

interface ReportField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'enum';
  enumValues?: { label: string; value: string }[];
}

interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'between';
  value: any;
  value2?: any; // For 'between' operator
}

interface ReportChart {
  type: 'bar' | 'line' | 'pie' | 'table';
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

interface ReportBuilderProps {
  availableFields: ReportField[];
  onGenerate?: (config: ReportConfig) => void;
  onSave?: (name: string, config: ReportConfig) => void;
  currentUserId: string;
}

interface ReportConfig {
  name: string;
  description?: string;
  fields: string[];
  filters: ReportFilter[];
  chart: ReportChart;
  sortBy?: { field: string; order: 'asc' | 'desc' };
  limit?: number;
}

const CHART_TYPES = [
  { value: 'table', label: '表格', icon: '📊' },
  { value: 'bar', label: '柱状图', icon: '📊' },
  { value: 'line', label: '折线图', icon: '📈' },
  { value: 'pie', label: '饼图', icon: '🥧' },
];

const AGGREGATIONS = [
  { value: 'sum', label: '求和' },
  { value: 'avg', label: '平均' },
  { value: 'count', label: '计数' },
  { value: 'min', label: '最小' },
  { value: 'max', label: '最大' },
];

export function ReportBuilder({
  availableFields,
  onGenerate,
  onSave,
  currentUserId,
}: ReportBuilderProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [chart, setChart] = useState<ReportChart>({
    type: 'table',
  });
  const [sortBy, setSortBy] = useState<{ field: string; order: 'asc' | 'desc' } | null>(null);
  const [limit, setLimit] = useState<number>(100);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Handle field selection
  const handleToggleField = useCallback((fieldKey: string) => {
    setSelectedFields((prev) => {
      if (prev.includes(fieldKey)) {
        return prev.filter((f) => f !== fieldKey);
      } else {
        return [...prev, fieldKey];
      }
    });
  }, []);

  // Handle field reordering
  const handleMoveField = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedFields((prev) => {
      const newFields = [...prev];
      const [removed] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, removed);
      return newFields;
    });
  }, []);

  // Handle add filter
  const handleAddFilter = useCallback(() => {
    if (availableFields.length === 0) return;

    const defaultField = availableFields.find((f) => f.type === 'enum') || availableFields[0];
    setFilters((prev) => [
      ...prev,
      {
        field: defaultField.key,
        operator: 'eq',
        value: '',
      },
    ]);
  }, [availableFields]);

  // Handle update filter
  const handleUpdateFilter = useCallback(
    (index: number, updates: Partial<ReportFilter>) => {
      setFilters((prev) =>
        prev.map((filter, i) => (i === index ? { ...filter, ...updates } : filter))
      );
    },
    []
  );

  // Handle remove filter
  const handleRemoveFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle generate report
  const handleGenerate = useCallback(() => {
    if (selectedFields.length === 0) {
      alert('请至少选择一个字段');
      return;
    }

    const config: ReportConfig = {
      name: reportName || '未命名报表',
      description: reportDescription,
      fields: selectedFields,
      filters,
      chart,
      sortBy: sortBy || undefined,
      limit,
    };

    if (onGenerate) {
      onGenerate(config);
    }
  }, [selectedFields, filters, chart, sortBy, limit, reportName, reportDescription, onGenerate]);

  // Handle save report
  const handleSave = useCallback(() => {
    if (!reportName.trim()) {
      alert('请输入报表名称');
      return;
    }

    if (selectedFields.length === 0) {
      alert('请至少选择一个字段');
      return;
    }

    const config: ReportConfig = {
      name: reportName,
      description: reportDescription,
      fields: selectedFields,
      filters,
      chart,
      sortBy: sortBy || undefined,
      limit,
    };

    if (onSave) {
      onSave(reportName, config);
      setShowSaveDialog(false);
      setReportName('');
      setReportDescription('');
    }
  }, [reportName, reportDescription, selectedFields, filters, chart, sortBy, limit, onSave]);

  const getFieldByKey = (key: string) => availableFields.find((f) => f.key === key);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>报表构建器</h3>
          <span style={styles.subtitle}>拖拽字段构建自定义报表</span>
        </div>

        <div style={styles.headerActions}>
          <button onClick={() => setShowSaveDialog(true)} style={styles.saveButton}>
            保存报表
          </button>
          <button onClick={handleGenerate} style={styles.generateButton}>
            生成报表
          </button>
        </div>
      </div>

      {/* Field Selection */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>选择字段</h4>
        <div style={styles.fieldGrid}>
          {availableFields.map((field) => {
            const isSelected = selectedFields.includes(field.key);
            const selectedIndex = selectedFields.indexOf(field.key);

            return (
              <div
                key={field.key}
                onClick={() => handleToggleField(field.key)}
                style={{
                  ...styles.fieldCard,
                  ...(isSelected && styles.fieldCardSelected),
                }}
              >
                <div style={styles.fieldHeader}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={styles.checkbox}
                  />
                  <span style={styles.fieldLabel}>{field.label}</span>
                  <span style={styles.fieldTypeBadge}>{getFieldTypeLabel(field.type)}</span>
                </div>

                {isSelected && selectedIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveField(selectedIndex, selectedIndex - 1);
                    }}
                    style={styles.moveButton}
                  >
                    ↑
                  </button>
                )}
                {isSelected && selectedIndex < selectedFields.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveField(selectedIndex, selectedIndex + 1);
                    }}
                    style={styles.moveButton}
                  >
                    ↓
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>筛选条件</h4>
          <button onClick={handleAddFilter} style={styles.addFilterButton}>
            + 添加筛选
          </button>
        </div>

        {filters.length === 0 ? (
          <div style={styles.emptyState}>暂无筛选条件</div>
        ) : (
          <div style={styles.filtersList}>
            {filters.map((filter, index) => {
              const field = getFieldByKey(filter.field);
              if (!field) return null;

              return (
                <div key={index} style={styles.filterRow}>
                  <select
                    value={filter.field}
                    onChange={(e) => handleUpdateFilter(index, { field: e.target.value })}
                    style={styles.filterSelect}
                  >
                    {availableFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filter.operator}
                    onChange={(e) => handleUpdateFilter(index, { operator: e.target.value as any })}
                    style={styles.filterSelect}
                  >
                    <option value="eq">等于</option>
                    <option value="ne">不等于</option>
                    <option value="gt">大于</option>
                    <option value="lt">小于</option>
                    <option value="gte">大于等于</option>
                    <option value="lte">小于等于</option>
                    <option value="contains">包含</option>
                    <option value="between">介于</option>
                  </select>

                  {field.type === 'enum' ? (
                    <select
                      value={filter.value}
                      onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                      style={styles.filterSelect}
                    >
                      <option value="">全部</option>
                      {field.enumValues?.map((ev) => (
                        <option key={ev.value} value={ev.value}>
                          {ev.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                      value={filter.value}
                      onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                      style={styles.filterInput}
                    />
                  )}

                  {filter.operator === 'between' && (
                    <input
                      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                      value={filter.value2 || ''}
                      onChange={(e) => handleUpdateFilter(index, { value2: e.target.value })}
                      style={styles.filterInput}
                      placeholder="结束值"
                    />
                  )}

                  <button
                    onClick={() => handleRemoveFilter(index)}
                    style={styles.removeFilterButton}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart Configuration */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>图表配置</h4>
        <div style={styles.chartConfig}>
          <div style={styles.configRow}>
            <label style={styles.configLabel}>图表类型:</label>
            <div style={styles.chartTypes}>
              {CHART_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setChart({ ...chart, type: type.value as any })}
                  style={{
                    ...styles.chartTypeButton,
                    ...(chart.type === type.value && styles.chartTypeButtonSelected),
                  }}
                >
                  <span style={styles.chartTypeIcon}>{type.icon}</span>
                  <span style={styles.chartTypeLabel}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {chart.type !== 'table' && (
            <>
              <div style={styles.configRow}>
                <label style={styles.configLabel}>X轴 (分组):</label>
                <select
                  value={chart.xAxis || ''}
                  onChange={(e) => setChart({ ...chart, xAxis: e.target.value })}
                  style={styles.configSelect}
                >
                  <option value="">选择字段</option>
                  {selectedFields.map((key) => {
                    const field = getFieldByKey(key);
                    return field ? (
                      <option key={key} value={key}>
                        {field.label}
                      </option>
                    ) : null;
                  })}
                </select>
              </div>

              <div style={styles.configRow}>
                <label style={styles.configLabel}>Y轴 (数值):</label>
                <select
                  value={chart.yAxis || ''}
                  onChange={(e) => setChart({ ...chart, yAxis: e.target.value })}
                  style={styles.configSelect}
                >
                  <option value="">选择字段</option>
                  {selectedFields.map((key) => {
                    const field = getFieldByKey(key);
                    return field && field.type === 'number' ? (
                      <option key={key} value={key}>
                        {field.label}
                      </option>
                    ) : null;
                  })}
                </select>
              </div>

              <div style={styles.configRow}>
                <label style={styles.configLabel}>聚合方式:</label>
                <select
                  value={chart.aggregation || 'sum'}
                  onChange={(e) => setChart({ ...chart, aggregation: e.target.value as any })}
                  style={styles.configSelect}
                >
                  {AGGREGATIONS.map((agg) => (
                    <option key={agg.value} value={agg.value}>
                      {agg.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sort and Limit */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>排序和限制</h4>
        <div style={styles.sortConfig}>
          <div style={styles.configRow}>
            <label style={styles.configLabel}>排序字段:</label>
            <select
              value={sortBy?.field || ''}
              onChange={(e) => {
                const field = e.target.value;
                setSortBy((prev) => ({
                  field,
                  order: prev?.field === field ? prev.order : 'asc',
                }));
              }}
              style={styles.configSelect}
            >
              <option value="">不排序</option>
              {selectedFields.map((key) => {
                const field = getFieldByKey(key);
                return field ? (
                  <option key={key} value={key}>
                    {field.label}
                  </option>
                ) : null;
              })}
            </select>

            {sortBy && (
              <button
                onClick={() => setSortBy((prev) => ({ field: prev!.field, order: prev?.order === 'asc' ? 'desc' : 'asc' }))}
                style={styles.sortOrderButton}
              >
                {sortBy.order === 'asc' ? '↑ 升序' : '↓ 降序'}
              </button>
            )}
          </div>

          <div style={styles.configRow}>
            <label style={styles.configLabel}>结果限制:</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              style={styles.limitInput}
              min="1"
              max="10000"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <span style={styles.summaryText}>
          已选择 <strong>{selectedFields.length}</strong> 个字段,
          {filters.length > 0 && <strong> {filters.length} 个筛选条件</strong>}
        </span>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowSaveDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>保存报表</h3>

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  报表名称 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  style={styles.input}
                  placeholder="例如：月度销售报表"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  style={styles.textarea}
                  rows={3}
                  placeholder="简要描述报表的用途和内容"
                />
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setShowSaveDialog(false)} style={styles.cancelButton}>
                取消
              </button>
              <button onClick={handleSave} style={styles.confirmButton}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getFieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    text: '文本',
    number: '数字',
    date: '日期',
    boolean: '布尔',
    enum: '枚举',
  };
  return labels[type] || type;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  saveButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  generateButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  section: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  fieldCard: {
    padding: '12px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  fieldCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  fieldHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  fieldLabel: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  fieldTypeBadge: {
    padding: '2px 6px',
    fontSize: '11px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
  },
  moveButton: {
    padding: '2px 6px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '3px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#e5e7eb',
    },
  },
  addFilterButton: {
    padding: '4px 10px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#9ca3af',
  },
  filtersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '4px',
  },
  filterSelect: {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
  },
  filterInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  removeFilterButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  chartConfig: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  configLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    minWidth: '100px',
  },
  chartTypes: {
    display: 'flex',
    gap: '8px',
  },
  chartTypeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  chartTypeButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  chartTypeIcon: {
    fontSize: '16px',
  },
  chartTypeLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  configSelect: {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    minWidth: '150px',
  },
  sortConfig: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sortOrderButton: {
    padding: '6px 10px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  limitInput: {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    width: '100px',
  },
  summary: {
    padding: '12px',
    backgroundColor: '#eff6ff',
    borderRadius: '4px',
    border: '1px solid #dbeafe',
  },
  summaryText: {
    fontSize: '14px',
    color: '#1e40af',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  textarea: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
};

export default ReportBuilder;

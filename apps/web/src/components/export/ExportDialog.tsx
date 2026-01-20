import { useState, useMemo } from 'react';
import { ExportFormat, ExportType } from './ExportButton';

interface FieldOption {
  key: string;
  label: string;
  required?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  contractNumber: '合同编号',
  name: '名称',
  customerName: '客户名称',
  type: '类型',
  status: '状态',
  amount: '金额',
  signDate: '签署日期',
  startDate: '开始日期',
  endDate: '结束日期',
  shortName: '简称',
  industry: '行业',
  contactPerson: '联系人',
  phone: '电话',
  email: '邮箱',
  department: '部门',
  role: '角色',
  period: '期间',
  revenue: '收入',
  cost: '成本',
  profit: '利润',
  margin: '利润率',
  project: '项目',
  progress: '进度',
  milestone: '里程碑',
  dueDate: '截止日期',
  contracts: '合同数',
  customers: '客户数',
  conversion: '转化率',
};

interface ExportDialogProps {
  exportType: ExportType;
  data?: any[];
  filename?: string;
  onExport: (format: ExportFormat, fields: string[]) => Promise<void>;
  onClose: () => void;
  defaultFields?: string[];
}

export function ExportDialog({
  exportType,
  data,
  filename,
  onExport,
  onClose,
  defaultFields = [],
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(defaultFields));
  const [isExporting, setIsExporting] = useState(false);

  const availableFields: FieldOption[] = useMemo(() => {
    const fields: FieldOption[] = [];

    switch (exportType) {
      case 'contracts':
        fields.push(
          { key: 'contractNumber', label: '合同编号', required: true },
          { key: 'name', label: '合同名称', required: true },
          { key: 'customerName', label: '客户名称' },
          { key: 'type', label: '合同类型' },
          { key: 'status', label: '状态' },
          { key: 'amount', label: '合同金额' },
          { key: 'signDate', label: '签署日期' },
          { key: 'startDate', label: '开始日期' },
          { key: 'endDate', label: '结束日期' },
          { key: 'department', label: '负责部门' }
        );
        break;

      case 'customers':
        fields.push(
          { key: 'name', label: '客户名称', required: true },
          { key: 'shortName', label: '简称' },
          { key: 'industry', label: '行业' },
          { key: 'status', label: '状态' },
          { key: 'contactPerson', label: '联系人' },
          { key: 'phone', label: '电话' },
          { key: 'email', label: '邮箱' },
          { key: 'address', label: '地址' }
        );
        break;

      case 'users':
        fields.push(
          { key: 'name', label: '姓名', required: true },
          { key: 'email', label: '邮箱', required: true },
          { key: 'department', label: '部门' },
          { key: 'role', label: '角色' },
          { key: 'status', label: '状态' },
          { key: 'phone', label: '电话' }
        );
        break;

      case 'financial':
        fields.push(
          { key: 'period', label: '期间', required: true },
          { key: 'revenue', label: '收入' },
          { key: 'cost', label: '成本' },
          { key: 'profit', label: '利润' },
          { key: 'margin', label: '利润率' }
        );
        break;

      case 'delivery':
        fields.push(
          { key: 'project', label: '项目', required: true },
          { key: 'progress', label: '进度' },
          { key: 'status', label: '状态' },
          { key: 'milestone', label: '当前里程碑' },
          { key: 'dueDate', label: '截止日期' }
        );
        break;

      case 'sales':
        fields.push(
          { key: 'period', label: '期间', required: true },
          { key: 'contracts', label: '合同数' },
          { key: 'amount', label: '金额' },
          { key: 'customers', label: '客户数' },
          { key: 'conversion', label: '转化率' }
        );
        break;
    }

    return fields;
  }, [exportType]);

  const handleToggleField = (key: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedFields(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedFields(new Set(availableFields.map((f) => f.key)));
  };

  const handleClearAll = () => {
    setSelectedFields(new Set(availableFields.filter((f) => f.required).map((f) => f.key)));
  };

  const handleExport = async () => {
    if (selectedFields.size === 0) {
      alert('请至少选择一个字段');
      return;
    }

    setIsExporting(true);
    try {
      await onExport(format, Array.from(selectedFields));
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatLabel = (fmt: ExportFormat) => {
    switch (fmt) {
      case 'excel':
        return 'Excel (.xlsx)';
      case 'csv':
        return 'CSV (.csv)';
      case 'pdf':
        return 'PDF (.pdf)';
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>导出数据</h3>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Format Selection */}
          <div style={styles.section}>
            <label style={styles.label}>导出格式</label>
            <div style={styles.formatOptions}>
              {(['excel', 'csv', 'pdf'] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  style={{
                    ...styles.formatOption,
                    ...(format === fmt && styles.formatOptionSelected),
                  }}
                >
                  {getFormatLabel(fmt)}
                </button>
              ))}
            </div>
          </div>

          {/* Field Selection */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <label style={styles.label}>选择字段</label>
              <div style={styles.fieldActions}>
                <button onClick={handleSelectAll} style={styles.textButton}>
                  全选
                </button>
                <button onClick={handleClearAll} style={styles.textButton}>
                  清除
                </button>
              </div>
            </div>
            <div style={styles.fieldList}>
              {availableFields.map((field) => (
                <label key={field.key} style={styles.fieldItem}>
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.key)}
                    onChange={() => handleToggleField(field.key)}
                    disabled={field.required}
                    style={styles.checkbox}
                  />
                  <span style={styles.fieldLabel}>{field.label}</span>
                  {field.required && <span style={styles.required}> *</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          {data && data.length > 0 && (
            <div style={styles.section}>
              <label style={styles.label}>
                预览 ({data.length} 条记录)
              </label>
              <div style={styles.preview}>
                <div style={styles.previewHeader}>
                  {Array.from(selectedFields).map((key) => (
                    <div key={key} style={styles.previewCell}>
                      {FIELD_LABELS[key] || key}
                    </div>
                  ))}
                </div>
                {data.slice(0, 3).map((row, index) => (
                  <div key={index} style={styles.previewRow}>
                    {Array.from(selectedFields).map((key) => (
                      <div key={key} style={styles.previewCell}>
                        {row[key] ?? '-'}
                      </div>
                    ))}
                  </div>
                ))}
                {data.length > 3 && (
                  <div style={styles.previewMore}>
                    ...还有 {data.length - 3} 条记录
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filename */}
          <div style={styles.section}>
            <label style={styles.label}>文件名</label>
            <input
              type="text"
              value={filename || ''}
              placeholder={`导出_${new Date().toISOString().split('T')[0]}`}
              style={styles.input}
              readOnly
            />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton} disabled={isExporting}>
            取消
          </button>
          <button
            onClick={handleExport}
            style={styles.exportButton}
            disabled={isExporting || selectedFields.size === 0}
          >
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    fontSize: '20px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  formatOptions: {
    display: 'flex',
    gap: '8px',
  },
  formatOption: {
    flex: 1,
    padding: '10px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  formatOptionSelected: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  fieldActions: {
    display: 'flex',
    gap: '8px',
  },
  textButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  fieldList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  fieldItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  fieldLabel: {},
  required: {
    color: '#ef4444',
  },
  preview: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  previewHeader: {
    display: 'flex',
    gap: '1px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  previewRow: {
    display: 'flex',
    gap: '1px',
    borderBottom: '1px solid #e5e7eb',
  },
  previewCell: {
    flex: 1,
    padding: '8px',
    fontSize: '12px',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  previewMore: {
    padding: '8px',
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center' as const,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#f3f4f6',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  exportButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default ExportDialog;

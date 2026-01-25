import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMERS } from '../../graphql/customers';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

interface CustomerExportProps {
  selectedIds?: string[];
  filters?: Record<string, any>;
  onClose?: () => void;
}

// TODO: 客户导出功能 - 后端已实现但参数不同
// 后端签名: exportCustomers(format: ExportFormat, title: String, columns: [String!])
const EXPORT_CUSTOMERS = gql`
  mutation ExportCustomers($format: ExportFormat, $title: String, $columns: [String!]) {
    exportCustomers(format: $format, title: $title, columns: $columns) {
      downloadUrl
      fileName
      recordCount
    }
  }
`;

const AVAILABLE_FIELDS = [
  { field: 'id', label: '客户ID', required: true },
  { field: 'name', label: '客户名称', required: true },
  { field: 'shortName', label: '简称' },
  { field: 'creditCode', label: '统一社会信用代码' },
  { field: 'industry', label: '所属行业' },
  { field: 'status', label: '状态' },
  { field: 'address', label: '地址' },
  { field: 'contactPerson', label: '主联系人' },
  { field: 'contactPhone', label: '联系电话' },
  { field: 'contactEmail', label: '联系邮箱' },
  { field: 'createdAt', label: '创建时间' },
  { field: 'updatedAt', label: '更新时间' },
];

const EXPORT_FORMATS = [
  { value: 'EXCEL', label: 'Excel (.xlsx)', icon: '📊' },
  { value: 'CSV', label: 'CSV (.csv)', icon: '📄' },
  { value: 'PDF', label: 'PDF (.pdf)', icon: '📕' },
];

export function CustomerExport({
  selectedIds = [],
  filters,
  onClose,
}: CustomerExportProps) {
  const [format, setFormat] = useState('EXCEL');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(AVAILABLE_FIELDS.filter((f) => f.required).map((f) => f.field))
  );
  const [selectAll, setSelectAll] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const { data, loading } = useQuery(GET_CUSTOMERS, {
    variables: {
      filter: filters || {},
      ...(selectedIds.length > 0 && { filter: { ids: selectedIds } }),
    },
    fetchPolicy: 'cache-and-network',
  });

  const [exportCustomers] = useMutation(EXPORT_CUSTOMERS, {
    onCompleted: (data) => {
      const { downloadUrl, fileName } = data.exportCustomers;
      setIsExporting(false);

      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`导出成功: ${fileName} (${data.exportCustomers.recordCount} 条记录)`);
    },
    onError: (error) => {
      setIsExporting(false);
      alert(`导出失败: ${error.message}`);
    },
  });

  const customers = data?.customers?.items || [];
  const totalCount = data?.customers?.total || 0;

  const handleFieldToggle = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      // Prevent unselecting required fields
      const isRequired = AVAILABLE_FIELDS.find((f) => f.field === field)?.required;
      if (!isRequired || newSelected.size > 1) {
        newSelected.delete(field);
      }
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedFields(new Set(AVAILABLE_FIELDS.map((f) => f.field)));
      setSelectAll(false);
    } else {
      setSelectedFields(new Set(AVAILABLE_FIELDS.filter((f) => f.required).map((f) => f.field)));
      setSelectAll(true);
    }
  };

  const handleExport = () => {
    if (selectedFields.size === 0) {
      alert('请至少选择一个导出字段');
      return;
    }

    const idsToExport = selectedIds.length > 0 ? selectedIds : customers.map((c: any) => c.id);

    setIsExporting(true);
    exportCustomers({
      variables: {
        format: format as any,
        title: '客户列表导出',
        columns: Array.from(selectedFields),
      },
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>导出客户数据</h3>
          {selectedIds.length > 0 && (
            <span style={styles.selectionInfo}>
              已选择 {selectedIds.length} 个客户
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            ✕ 关闭
          </button>
        )}
      </div>

      {/* Summary */}
      {!loading && (
        <div style={styles.summary}>
          将导出 <strong>{selectedIds.length > 0 ? selectedIds.length : totalCount}</strong> 个客户的数据
        </div>
      )}

      {/* Format Selection */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>选择导出格式</h4>
        <div style={styles.formatGrid}>
          {EXPORT_FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => setFormat(fmt.value)}
              disabled={isExporting}
              style={{
                ...styles.formatButton,
                ...(format === fmt.value && styles.formatButtonSelected),
              }}
            >
              <span style={styles.formatIcon}>{fmt.icon}</span>
              <span style={styles.formatLabel}>{fmt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Field Selection */}
      <div style={styles.section}>
        <div style={styles.fieldHeader}>
          <h4 style={styles.sectionTitle}>选择导出字段</h4>
          <button
            onClick={handleSelectAll}
            style={styles.selectAllButton}
          >
            {selectAll ? '全选' : '取消全选'}
          </button>
        </div>

        <div style={styles.fieldGrid}>
          {AVAILABLE_FIELDS.map((field) => (
            <button
              key={field.field}
              onClick={() => handleFieldToggle(field.field)}
              disabled={isExporting || (field.required && selectedFields.has(field.field) && selectedFields.size === 1)}
              style={{
                ...styles.fieldButton,
                ...(selectedFields.has(field.field) && styles.fieldButtonSelected),
                ...(field.required && styles.fieldButtonRequired),
              }}
            >
              <div style={styles.fieldCheckbox}>
                {selectedFields.has(field.field) && <span style={styles.checkIcon}>✓</span>}
              </div>
              <span style={styles.fieldLabel}>{field.label}</span>
              {field.required && <span style={styles.requiredMark}>*</span>}
            </button>
          ))}
        </div>

        <div style={styles.fieldHelp}>
          <span style={styles.requiredIcon}>*</span> 必选字段
        </div>
      </div>

      {/* Export Button */}
      <div style={styles.actions}>
        <button
          onClick={handleExport}
          disabled={isExporting || selectedFields.size === 0}
          style={styles.exportButton}
        >
          {isExporting ? '导出中...' : `导出 ${selectedIds.length > 0 ? selectedIds.length : totalCount} 条数据`}
        </button>
      </div>

      {/* Loading Overlay */}
      {isExporting && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>正在导出...</p>
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
    maxWidth: '600px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  selectionInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  closeButton: {
    padding: '6px 12px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  summary: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#374151',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  formatButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  formatButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  formatIcon: {
    fontSize: '24px',
  },
  formatLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  selectAllButton: {
    padding: '4px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '8px',
  },
  fieldButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '13px',
  },
  fieldButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
  },
  fieldButtonRequired: {
    opacity: 0.7,
  },
  fieldCheckbox: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '2px',
  },
  checkIcon: {
    fontSize: '12px',
    color: '#3b82f6',
  },
  fieldLabel: {
    flex: 1,
  },
  requiredMark: {
    color: '#ef4444',
    marginLeft: '2px',
  },
  fieldHelp: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  requiredIcon: {
    color: '#ef4444',
  },
  actions: {
    marginTop: '20px',
  },
  exportButton: {
    width: '100%',
    padding: '12px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    textAlign: 'center',
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#374151',
  },
};

export default CustomerExport;

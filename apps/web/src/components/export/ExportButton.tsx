import { useState } from 'react';
import { ExportDialog } from './ExportDialog';

export type ExportFormat = 'excel' | 'csv' | 'pdf';
export type ExportType = 'contracts' | 'customers' | 'users' | 'financial' | 'delivery' | 'sales';

interface ExportButtonProps {
  exportType: ExportType;
  data?: any[];
  filename?: string;
  onExport?: (format: ExportFormat, fields: string[]) => Promise<void>;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'text';
  icon?: string;
}

const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  contracts: '合同列表',
  customers: '客户列表',
  users: '用户列表',
  financial: '财务报表',
  delivery: '交付报表',
  sales: '销售报表',
};

const DEFAULT_FIELDS: Record<ExportType, string[]> = {
  contracts: [
    'contractNumber',
    'name',
    'customerName',
    'type',
    'status',
    'amount',
    'signDate',
    'startDate',
    'endDate',
  ],
  customers: [
    'name',
    'shortName',
    'industry',
    'status',
    'contactPerson',
    'phone',
    'email',
  ],
  users: ['name', 'email', 'department', 'role', 'status'],
  financial: ['period', 'revenue', 'cost', 'profit', 'margin'],
  delivery: ['project', 'progress', 'status', 'milestone', 'dueDate'],
  sales: ['period', 'contracts', 'amount', 'customers', 'conversion'],
};

export function ExportButton({
  exportType,
  data,
  filename,
  onExport,
  disabled = false,
  size = 'medium',
  variant = 'secondary',
  icon = '📥',
}: ExportButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat, fields: string[]) => {
    setIsExporting(true);
    try {
      await onExport?.(format, fields);
      setShowDialog(false);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const sizes = {
    small: { padding: '4px 8px', fontSize: '12px' },
    medium: { padding: '8px 16px', fontSize: '14px' },
    large: { padding: '12px 20px', fontSize: '16px' },
  };

  const variants = {
    primary: {
      backgroundColor: '#3b82f6',
      color: '#fff',
      border: 'none',
    },
    secondary: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
    text: {
      backgroundColor: 'transparent',
      color: '#3b82f6',
      border: 'none',
    },
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        disabled={disabled || isExporting}
        style={{
          ...styles.button,
          ...sizes[size],
          ...variants[variant],
          ...(disabled && styles.buttonDisabled),
          ...(isExporting && styles.buttonLoading),
        }}
        title={`导出${EXPORT_TYPE_LABELS[exportType]}`}
      >
        {isExporting ? '⏳' : icon}
        <span>{isExporting ? '导出中...' : `导出`}</span>
      </button>

      {showDialog && (
        <ExportDialog
          exportType={exportType}
          data={data}
          filename={filename}
          onExport={handleExport}
          onClose={() => setShowDialog(false)}
          defaultFields={DEFAULT_FIELDS[exportType]}
        />
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  buttonLoading: {
    opacity: 0.7,
  },
};

export default ExportButton;

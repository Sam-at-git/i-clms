import { useState } from 'react';

// TODO: 合同导出功能待后端实现

interface ContractExportDialogProps {
  contractId: string;
  contractNo: string;
  onClose: () => void;
  onComplete?: (fileUrl: string, fileName: string) => void;
}

// Note: Backend only supports PDF and EXCEL formats
const EXPORT_FORMATS = [
  { value: 'PDF', label: 'PDF文档', icon: '📄' },
  { value: 'EXCEL', label: 'Excel表格', icon: '📊' },
];

type ExportFormat = 'PDF' | 'EXCEL';

interface ExportOptions {
  includeAnnotations?: boolean;
  includeVersions?: boolean;
  includeSigningStatus?: boolean;
  includeHistory?: boolean;
  watermark?: string;
  password?: string;
}

export function ContractExportDialog({
  contractNo,
  onClose,
  onComplete,
}: ContractExportDialogProps) {
  // State
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('PDF');
  const [options, setOptions] = useState<ExportOptions>({
    includeAnnotations: true,
    includeVersions: false,
    includeSigningStatus: true,
    includeHistory: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Keep onComplete in scope for future implementation
  void onComplete;

  const handleExport = () => {
    // TODO: 合同导出功能待后端实现
    alert('合同导出功能暂未开放');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>导出合同</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Contract Info */}
        <div style={styles.contractInfo}>
          <span style={styles.infoLabel}>合同:</span>
          <span style={styles.infoValue}>{contractNo}</span>
        </div>

        {/* Format Selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>选择导出格式</h3>
          <div style={styles.formatGrid}>
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format.value}
                onClick={() => setSelectedFormat(format.value as ExportFormat)}
                disabled={isExporting}
                style={{
                  ...styles.formatButton,
                  ...(selectedFormat === format.value && styles.formatButtonSelected),
                }}
              >
                <span style={styles.formatIcon}>{format.icon}</span>
                <span style={styles.formatLabel}>{format.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>导出选项</h3>
          <div style={styles.optionsList}>
            <label style={styles.optionItem}>
              <input
                type="checkbox"
                checked={options.includeAnnotations}
                onChange={(e) =>
                  setOptions({ ...options, includeAnnotations: e.target.checked })
                }
                disabled={isExporting}
                style={styles.checkbox}
              />
              <span style={styles.optionLabel}>包含批注</span>
              <span style={styles.optionDesc}>导出文档中的批注和标记</span>
            </label>

            <label style={styles.optionItem}>
              <input
                type="checkbox"
                checked={options.includeVersions}
                onChange={(e) =>
                  setOptions({ ...options, includeVersions: e.target.checked })
                }
                disabled={isExporting}
                style={styles.checkbox}
              />
              <span style={styles.optionLabel}>包含版本历史</span>
              <span style={styles.optionDesc}>包含所有历史版本信息</span>
            </label>

            <label style={styles.optionItem}>
              <input
                type="checkbox"
                checked={options.includeSigningStatus}
                onChange={(e) =>
                  setOptions({ ...options, includeSigningStatus: e.target.checked })
                }
                disabled={isExporting}
                style={styles.checkbox}
              />
              <span style={styles.optionLabel}>包含签署状态</span>
              <span style={styles.optionDesc}>包含各方签署状态信息</span>
            </label>

            <label style={styles.optionItem}>
              <input
                type="checkbox"
                checked={options.includeHistory}
                onChange={(e) =>
                  setOptions({ ...options, includeHistory: e.target.checked })
                }
                disabled={isExporting}
                style={styles.checkbox}
              />
              <span style={styles.optionLabel}>包含操作历史</span>
              <span style={styles.optionDesc}>包含完整的操作审计记录</span>
            </label>
          </div>

          {/* Watermark */}
          <div style={styles.formGroup}>
            <label style={styles.label}>水印文字（可选）</label>
            <input
              type="text"
              value={options.watermark || ''}
              onChange={(e) => setOptions({ ...options, watermark: e.target.value || undefined })}
              placeholder="例如: 内部文件、草稿等"
              disabled={isExporting}
              style={styles.input}
            />
          </div>

          {/* Password Protection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>密码保护（可选）</label>
            <input
              type="password"
              value={options.password || ''}
              onChange={(e) => setOptions({ ...options, password: e.target.value || undefined })}
              placeholder="设置打开密码（仅PDF支持）"
              disabled={isExporting}
              style={styles.input}
            />
          </div>
        </div>

        {/* Progress Bar */}
        {isExporting && (
          <div style={styles.progressSection}>
            <div style={styles.progressInfo}>
              <span>正在导出...</span>
              <span>{progress}%</span>
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={onClose} disabled={isExporting} style={styles.cancelButton}>
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={styles.exportButton}
          >
            {isExporting ? '导出中...' : '开始导出'}
          </button>
        </div>

        {/* Format Description */}
        <div style={styles.formatDescription}>
          <strong>提示:</strong> {' '}
          {selectedFormat === 'PDF' && 'PDF格式适合打印和归档，支持密码保护。'}
          {selectedFormat === 'EXCEL' && 'Excel格式适合数据分析和处理。'}
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
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  closeButton: {
    padding: '4px 8px',
    fontSize: '18px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  contractInfo: {
    padding: '16px 20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
  },
  infoLabel: {
    color: '#6b7280',
    marginRight: '8px',
  },
  infoValue: {
    color: '#111827',
    fontWeight: 500,
  },
  section: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
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
    fontSize: '32px',
  },
  formatLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  optionItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  checkbox: {
    cursor: 'pointer',
  },
  optionLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  optionDesc: {
    fontSize: '12px',
    color: '#6b7280',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
  },
  progressSection: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#374151',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px',
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
  exportButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  formatDescription: {
    padding: '16px 20px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
};

export default ContractExportDialog;

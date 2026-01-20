import { useState } from 'react';
import { ReportType, ReportFormat } from './ReportTemplateSelector';

interface ReportPreviewProps {
  reportType: ReportType;
  format: ReportFormat;
  title: string;
  data?: any;
  onClose?: () => void;
  onGenerate?: () => void;
}

export function ReportPreview({
  reportType,
  format,
  title,
  data,
  onClose,
  onGenerate,
}: ReportPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(false);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await onGenerate?.();
    } finally {
      setLoading(false);
    }
  };

  const getPreviewContent = () => {
    if (!data) {
      return (
        <div style={styles.emptyPreview}>
          <div style={styles.emptyIcon}>📊</div>
          <div style={styles.emptyText}>数据加载中...</div>
        </div>
      );
    }

    // 简化的预览 - 实际应用中会根据reportType和format生成真实预览
    return (
      <div style={styles.previewContent}>
        <div style={styles.previewHeader}>
          <h2 style={styles.previewTitle}>{title}</h2>
          <div style={styles.previewDate}>
            生成时间: {new Date().toLocaleString('zh-CN')}
          </div>
        </div>
        <div style={styles.previewBody}>
          <div style={styles.previewSection}>
            <h4 style={styles.sectionTitle}>概览</h4>
            <div style={styles.sectionContent}>
              {data.summary && (
                <div style={styles.summaryGrid}>
                  {Object.entries(data.summary).map(([key, value]: [string, any]) => (
                    <div key={key} style={styles.summaryItem}>
                      <div style={styles.summaryLabel}>{key}</div>
                      <div style={styles.summaryValue}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {data.details && data.details.length > 0 && (
            <div style={styles.previewSection}>
              <h4 style={styles.sectionTitle}>详细数据</h4>
              <div style={styles.sectionContent}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      {Object.keys(data.details[0]).map((key) => (
                        <th key={key} style={styles.tableCell}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.details.slice(0, 10).map((row: any, index: number) => (
                      <tr key={index} style={styles.tableRow}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} style={styles.tableCell}>
                            {value?.toString() ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.details.length > 10 && (
                  <div style={styles.moreRows}>
                    ...还有 {data.details.length - 10} 行数据
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <span style={styles.toolbarTitle}>报表预览</span>
            <span style={styles.toolbarMeta}>
              {format.toUpperCase()} • {zoom}%
            </span>
          </div>
          <div style={styles.toolbarRight}>
            <button onClick={handleZoomOut} style={styles.zoomButton} disabled={zoom <= 50}>
              ➖
            </button>
            <button onClick={handleZoomIn} style={styles.zoomButton} disabled={zoom >= 150}>
              ➕
            </button>
            <button
              onClick={handleGenerate}
              style={styles.generateButton}
              disabled={loading}
            >
              {loading ? '生成中...' : '生成报表'}
            </button>
            <button onClick={onClose} style={styles.closeButton}>
              ✕
            </button>
          </div>
        </div>

        {/* Preview */}
        <div style={styles.preview}>
          <div
            style={{
              ...styles.previewWrapper,
              transform: `scale(${zoom / 100})`,
            }}
          >
            {format === 'pdf' ? (
              <div style={styles.pdfPreview}>{getPreviewContent()}</div>
            ) : (
              <div style={styles.excelPreview}>{getPreviewContent()}</div>
            )}
          </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    width: '90vw',
    height: '90vh',
    backgroundColor: '#fff',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toolbarTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  toolbarMeta: {
    fontSize: '13px',
    color: '#6b7280',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  zoomButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  generateButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  preview: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    backgroundColor: '#f3f4f6',
  },
  previewWrapper: {
    width: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderRadius: '4px',
    transformOrigin: 'top center',
  },
  pdfPreview: {
    padding: '40px',
  },
  excelPreview: {
    padding: '20px',
  },
  previewContent: {
    fontSize: '14px',
  },
  previewHeader: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e5e7eb',
  },
  previewTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  previewDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  previewBody: {},
  previewSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionContent: {},
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  summaryItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  summaryValue: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
  },
  tableCell: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    color: '#374151',
  },
  moreRows: {
    padding: '12px',
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic' as const,
  },
  emptyPreview: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
};

export default ReportPreview;

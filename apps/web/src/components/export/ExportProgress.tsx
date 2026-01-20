import { useState, useEffect } from 'react';

export type ExportStatus = 'preparing' | 'processing' | 'completed' | 'error';

interface ExportProgressProps {
  status: ExportStatus;
  progress?: number;
  fileName?: string;
  fileSize?: string;
  downloadUrl?: string;
  error?: string;
  onClose?: () => void;
}

export function ExportProgress({
  status,
  progress = 0,
  fileName,
  fileSize,
  downloadUrl,
  error,
  onClose,
}: ExportProgressProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (status === 'completed' && !showDetails) {
      setShowDetails(true);
    }
  }, [status, showDetails]);

  const getStatusMessage = () => {
    switch (status) {
      case 'preparing':
        return '准备导出...';
      case 'processing':
        return `处理中... ${Math.round(progress)}%`;
      case 'completed':
        return '导出完成';
      case 'error':
        return '导出失败';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'preparing':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'preparing':
        return '#3b82f6';
      case 'processing':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'error':
        return '#ef4444';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>{getStatusIcon()}</span>
          <div style={styles.headerText}>
            <div style={styles.title}>数据导出</div>
            <div style={styles.message}>{getStatusMessage()}</div>
          </div>
        </div>
        {onClose && (status === 'completed' || status === 'error') && (
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {(status === 'preparing' || status === 'processing') && (
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
                backgroundColor: getStatusColor(),
              }}
            />
          </div>
          <div style={styles.progressText}>{Math.round(progress)}%</div>
        </div>
      )}

      {/* Error Message */}
      {status === 'error' && error && (
        <div style={styles.errorSection}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorMessage}>{error}</div>
        </div>
      )}

      {/* Completed Details */}
      {status === 'completed' && showDetails && (
        <div style={styles.detailsSection}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>文件名:</span>
            <span style={styles.detailValue}>{fileName}</span>
          </div>
          {fileSize && (
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>大小:</span>
              <span style={styles.detailValue}>{fileSize}</span>
            </div>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={fileName}
              style={styles.downloadButton}
            >
              📥 下载文件
            </a>
          )}
        </div>
      )}

      {/* Processing Steps */}
      {status === 'processing' && (
        <div style={styles.stepsSection}>
          <div
            style={{
              ...styles.step,
              ...(progress >= 20 && styles.stepCompleted),
            }}
          >
            <span style={styles.stepIcon}>{progress >= 20 ? '✓' : '1'}</span>
            <span style={styles.stepText}>收集数据</span>
          </div>
          <div
            style={{
              ...styles.step,
              ...(progress >= 50 && styles.stepCompleted),
            }}
          >
            <span style={styles.stepIcon}>{progress >= 50 ? '✓' : '2'}</span>
            <span style={styles.stepText}>格式化</span>
          </div>
          <div
            style={{
              ...styles.step,
              ...(progress >= 80 && styles.stepCompleted),
            }}
          >
            <span style={styles.stepIcon}>{progress >= 80 ? '✓' : '3'}</span>
            <span style={styles.stepText}>生成文件</span>
          </div>
          <div
            style={{
              ...styles.step,
              ...(progress >= 100 && styles.stepCompleted),
            }}
          >
            <span style={styles.stepIcon}>{progress >= 100 ? '✓' : '4'}</span>
            <span style={styles.stepText}>完成</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ExportProgressListProps {
  exports: Array<{
    id: string;
    status: ExportStatus;
    progress?: number;
    fileName?: string;
    fileSize?: string;
    downloadUrl?: string;
    error?: string;
  }>;
  onRemove?: (id: string) => void;
}

export function ExportProgressList({ exports, onRemove }: ExportProgressListProps) {
  if (exports.length === 0) return null;

  return (
    <div style={styles.listContainer}>
      <div style={styles.listHeader}>
        <span style={styles.listTitle}>导出进度</span>
        <span style={styles.listCount}>({exports.length})</span>
      </div>
      <div style={styles.listItems}>
        {exports.map((exp) => (
          <div key={exp.id} style={styles.listItem}>
            <ExportProgress
              status={exp.status}
              progress={exp.progress}
              fileName={exp.fileName}
              fileSize={exp.fileSize}
              downloadUrl={exp.downloadUrl}
              error={exp.error}
              onClose={() => onRemove?.(exp.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    fontSize: '24px',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  message: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  closeButton: {
    fontSize: '16px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  progressSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    minWidth: '40px',
    textAlign: 'right' as const,
  },
  errorSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
  },
  errorIcon: {
    fontSize: '16px',
  },
  errorMessage: {
    flex: 1,
    fontSize: '13px',
    color: '#991b1b',
  },
  detailsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  detailItem: {
    display: 'flex',
    fontSize: '13px',
  },
  detailLabel: {
    color: '#6b7280',
    minWidth: '80px',
  },
  detailValue: {
    color: '#111827',
    fontWeight: 500,
  },
  downloadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  stepsSection: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  step: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  stepCompleted: {
    color: '#10b981',
  },
  stepIcon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: 600,
  },
  stepText: {},
  listContainer: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    width: '400px',
    maxHeight: '80vh',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 9999,
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  listTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  listCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
  listItems: {
    maxHeight: 'calc(80vh - 60px)',
    overflowY: 'auto' as const,
    padding: '12px',
  },
  listItem: {
    marginBottom: '8px',
  },
};

export default ExportProgress;

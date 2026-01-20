import { useState } from 'react';
import { Alert } from './AlertList';

interface AlertDialogProps {
  show: boolean;
  alert: Alert | null;
  onStatusChange?: (alertId: string, newStatus: Alert['status']) => void;
  onDismiss?: (alertId: string) => void;
  onClose: () => void;
}

export function AlertDialog({ show, alert, onStatusChange, onDismiss, onClose }: AlertDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!show || !alert) return null;

  const handleStatusChange = async (newStatus: Alert['status']) => {
    setIsProcessing(true);
    try {
      onStatusChange?.(alert.id, newStatus);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    onDismiss?.(alert.id);
    onClose();
  };

  const getLevelColor = (level: Alert['level']) => {
    switch (level) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
    }
  };

  const getLevelLabel = (level: Alert['level']) => {
    switch (level) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
    }
  };

  const getStatusLabel = (status: Alert['status']) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'acknowledged':
        return '已确认';
      case 'resolved':
        return '已解决';
      case 'dismissed':
        return '已忽略';
    }
  };

  const getTypeLabel = (type: Alert['type']) => {
    switch (type) {
      case 'contract_expiring':
        return '合同到期';
      case 'payment_overdue':
        return '付款逾期';
      case 'milestone_due':
        return '里程碑到期';
      case 'budget_warning':
        return '预算警告';
      case 'custom':
        return '自定义';
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div
              style={{
                ...styles.levelBadge,
                backgroundColor: getLevelColor(alert.level),
              }}
            >
              {getLevelLabel(alert.level)}优先级
            </div>
            <div style={styles.typeBadge}>{getTypeLabel(alert.type)}</div>
          </div>
          <button onClick={onClose} style={styles.closeButton} disabled={isProcessing}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <h3 style={styles.title}>{alert.title}</h3>
          <p style={styles.message}>{alert.message}</p>

          {/* Entity Info */}
          {alert.entity && (
            <div style={styles.entityInfo}>
              <div style={styles.entityLabel}>相关对象</div>
              <div style={styles.entityValue}>
                <span style={styles.entityType}>{alert.entity.type}:</span>{' '}
                <span style={styles.entityName}>{alert.entity.name}</span>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div style={styles.metadata}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>状态:</span>
              <span style={styles.metadataValue}>{getStatusLabel(alert.status)}</span>
            </div>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>创建时间:</span>
              <span style={styles.metadataValue}>{new Date(alert.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            {alert.dueDate && (
              <div style={styles.metadataItem}>
                <span style={styles.metadataLabel}>截止时间:</span>
                <span
                  style={{
                    ...styles.metadataValue,
                    ...(new Date(alert.dueDate) < new Date() && alert.status === 'pending'
                      ? styles.overdue
                      : {}),
                  }}
                >
                  {new Date(alert.dueDate).toLocaleString('zh-CN')}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {alert.actions && alert.actions.length > 0 && (
            <div style={styles.suggestedActions}>
              <div style={styles.suggestedActionsLabel}>建议操作:</div>
              <div style={styles.actionButtons}>
                {alert.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleStatusChange('acknowledged')}
                    style={styles.suggestedActionButton}
                    disabled={isProcessing}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {alert.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatusChange('acknowledged')}
                style={styles.acknowledgeButton}
                disabled={isProcessing}
              >
                {isProcessing ? '处理中...' : '确认收到'}
              </button>
              <button
                onClick={() => handleStatusChange('resolved')}
                style={styles.resolveButton}
                disabled={isProcessing}
              >
                {isProcessing ? '处理中...' : '标记已解决'}
              </button>
              <button onClick={handleDismiss} style={styles.dismissButton} disabled={isProcessing}>
                忽略
              </button>
            </>
          )}
          {alert.status === 'acknowledged' && (
            <>
              <button
                onClick={() => handleStatusChange('resolved')}
                style={styles.resolveButton}
                disabled={isProcessing}
              >
                {isProcessing ? '处理中...' : '标记已解决'}
              </button>
              <button onClick={handleDismiss} style={styles.dismissButton} disabled={isProcessing}>
                忽略
              </button>
            </>
          )}
          {alert.status === 'resolved' && (
            <button onClick={onClose} style={styles.closeButtonFooter} disabled={isProcessing}>
              关闭
            </button>
          )}
          {alert.status === 'dismissed' && (
            <button onClick={onClose} style={styles.closeButtonFooter} disabled={isProcessing}>
              关闭
            </button>
          )}
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
  headerLeft: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  levelBadge: {
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    borderRadius: '4px',
  },
  typeBadge: {
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
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
    padding: '20px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 12px 0',
  },
  message: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.6,
    margin: '0 0 16px 0',
  },
  entityInfo: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  entityLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  entityValue: {
    fontSize: '14px',
    color: '#374151',
  },
  entityType: {
    color: '#6b7280',
  },
  entityName: {
    fontWeight: 500,
    color: '#3b82f6',
  },
  metadata: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  metadataItem: {
    display: 'flex',
    fontSize: '13px',
  },
  metadataLabel: {
    color: '#6b7280',
    minWidth: '100px',
  },
  metadataValue: {
    color: '#111827',
    fontWeight: 500,
  },
  overdue: {
    color: '#ef4444',
  },
  suggestedActions: {
    marginBottom: '16px',
  },
  suggestedActionsLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  suggestedActionButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
  },
  acknowledgeButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  resolveButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  dismissButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  closeButtonFooter: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default AlertDialog;

import { useState } from 'react';

export interface Alert {
  id: string;
  type: 'contract_expiring' | 'payment_overdue' | 'milestone_due' | 'budget_warning' | 'custom';
  level: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  entity?: {
    type: 'contract' | 'customer' | 'project';
    id: string;
    name: string;
  };
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
  createdAt: string;
  dueDate?: string;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

interface AlertListProps {
  alerts: Alert[];
  onStatusChange?: (alertId: string, newStatus: Alert['status']) => void;
  onDismiss?: (alertId: string) => void;
  filterByStatus?: Alert['status'][];
  filterByLevel?: Alert['level'][];
}

export function AlertList({
  alerts,
  onStatusChange,
  onDismiss,
  filterByStatus,
  filterByLevel,
}: AlertListProps) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filters, setFilters] = useState({
    status: filterByStatus || [],
    level: filterByLevel || [],
  });

  const filteredAlerts = alerts.filter((alert) => {
    if (filters.status.length > 0 && !filters.status.includes(alert.status)) return false;
    if (filters.level.length > 0 && !filters.level.includes(alert.level)) return false;
    return true;
  });

  const toggleStatusFilter = (status: Alert['status']) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const toggleLevelFilter = (level: Alert['level']) => {
    setFilters((prev) => ({
      ...prev,
      level: prev.level.includes(level)
        ? prev.level.filter((l) => l !== level)
        : [...prev.level, level],
    }));
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

  const handleStatusChange = (alertId: string, newStatus: Alert['status']) => {
    onStatusChange?.(alertId, newStatus);
  };

  const handleDismiss = (alertId: string) => {
    onDismiss?.(alertId);
  };

  return (
    <div style={styles.container}>
      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>状态:</span>
          {(['pending', 'acknowledged', 'resolved', 'dismissed'] as Alert['status'][]).map((status) => (
            <button
              key={status}
              onClick={() => toggleStatusFilter(status)}
              style={{
                ...styles.filterButton,
                ...(filters.status.includes(status) && styles.filterButtonActive),
              }}
            >
              {getStatusLabel(status)}
            </button>
          ))}
        </div>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>优先级:</span>
          {(['high', 'medium', 'low'] as Alert['level'][]).map((level) => (
            <button
              key={level}
              onClick={() => toggleLevelFilter(level)}
              style={{
                ...styles.filterButton,
                ...(filters.level.includes(level) && styles.filterButtonActive),
              }}
            >
              {getLevelLabel(level)}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div style={styles.alertList}>
        {filteredAlerts.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <div style={styles.emptyText}>暂无提醒</div>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                ...styles.alertItem,
                ...(alert.status === 'resolved' && styles.alertItemResolved),
              }}
            >
              {/* Level Indicator */}
              <div
                style={{
                  ...styles.levelIndicator,
                  backgroundColor: getLevelColor(alert.level),
                }}
              />

              {/* Alert Content */}
              <div style={styles.alertContent}>
                <div style={styles.alertHeader}>
                  <h4 style={styles.alertTitle}>{alert.title}</h4>
                  <span style={styles.alertStatus}>{getStatusLabel(alert.status)}</span>
                </div>
                <p style={styles.alertMessage}>{alert.message}</p>

                {/* Entity */}
                {alert.entity && (
                  <div style={styles.alertEntity}>
                    <span style={styles.entityLabel}>{alert.entity.type}:</span>
                    <span style={styles.entityName}>{alert.entity.name}</span>
                  </div>
                )}

                {/* Dates */}
                <div style={styles.alertDates}>
                  <span style={styles.dateLabel}>创建时间: {new Date(alert.createdAt).toLocaleString('zh-CN')}</span>
                  {alert.dueDate && (
                    <span style={styles.dateLabel}>
                      截止时间: {new Date(alert.dueDate).toLocaleString('zh-CN')}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {alert.actions && alert.actions.length > 0 && (
                  <div style={styles.alertActions}>
                    {alert.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleStatusChange(alert.id, 'acknowledged')}
                        style={styles.actionButton}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Status Actions */}
                {alert.status === 'pending' && (
                  <div style={styles.statusActions}>
                    <button
                      onClick={() => handleStatusChange(alert.id, 'acknowledged')}
                      style={styles.acknowledgeButton}
                    >
                      确认
                    </button>
                    <button
                      onClick={() => handleStatusChange(alert.id, 'resolved')}
                      style={styles.resolveButton}
                    >
                      标记已解决
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      style={styles.dismissButton}
                    >
                      忽略
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Detail Dialog */}
      {selectedAlert && (
        <div style={styles.dialogOverlay} onClick={() => setSelectedAlert(null)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogHeader}>
              <h3 style={styles.dialogTitle}>{selectedAlert.title}</h3>
              <button onClick={() => setSelectedAlert(null)} style={styles.closeButton}>
                ✕
              </button>
            </div>
            <div style={styles.dialogContent}>
              <p style={styles.dialogMessage}>{selectedAlert.message}</p>
              {selectedAlert.entity && (
                <div style={styles.dialogEntity}>
                  <strong>相关对象:</strong> {selectedAlert.entity.name}
                </div>
              )}
              <div style={styles.dialogMeta}>
                <div>优先级: {getLevelLabel(selectedAlert.level)}</div>
                <div>状态: {getStatusLabel(selectedAlert.status)}</div>
                <div>创建时间: {new Date(selectedAlert.createdAt).toLocaleString('zh-CN')}</div>
                {selectedAlert.dueDate && (
                  <div>截止时间: {new Date(selectedAlert.dueDate).toLocaleString('zh-CN')}</div>
                )}
              </div>
            </div>
            <div style={styles.dialogFooter}>
              <button
                onClick={() => {
                  handleStatusChange(selectedAlert.id, 'acknowledged');
                  setSelectedAlert(null);
                }}
                style={styles.dialogButton}
              >
                确认
              </button>
              <button
                onClick={() => setSelectedAlert(null)}
                style={{ ...styles.dialogButton, ...styles.dialogButtonSecondary }}
              >
                关闭
              </button>
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
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  filterButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  alertItem: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'box-shadow 0.2s',
  },
  alertItemResolved: {
    opacity: 0.6,
  },
  levelIndicator: {
    width: '4px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  alertStatus: {
    fontSize: '12px',
    padding: '2px 8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    color: '#6b7280',
  },
  alertMessage: {
    fontSize: '14px',
    color: '#4b5563',
    margin: 0,
  },
  alertEntity: {
    display: 'flex',
    gap: '6px',
    fontSize: '13px',
  },
  entityLabel: {
    color: '#6b7280',
  },
  entityName: {
    color: '#3b82f6',
    fontWeight: 500,
  },
  alertDates: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  dateLabel: {},
  alertActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  statusActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  acknowledgeButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  resolveButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  dismissButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  dialogOverlay: {
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
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  dialogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  dialogTitle: {
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
  dialogContent: {
    marginBottom: '24px',
  },
  dialogMessage: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 12px 0',
  },
  dialogEntity: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '12px',
  },
  dialogMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#6b7280',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  dialogFooter: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  dialogButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  dialogButtonSecondary: {
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
};

export default AlertList;

import { Link } from 'react-router-dom';

export interface RiskAlert {
  id: string;
  contractId: string;
  alertType: string;
  severity: string;
  message: string;
  createdAt: Date | string;
}

interface RiskAlertListProps {
  alerts: RiskAlert[];
  onDismiss?: (alertId: string) => void;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  EXPIRY_WARNING: '到期预警',
  HIGH_VALUE: '高价值预警',
  PAYMENT_DELAY: '付款延迟',
  COMPLIANCE: '合规风险',
  LEGAL: '法务风险',
};

const ALERT_TYPE_ICONS: Record<string, string> = {
  EXPIRY_WARNING: '⏰',
  HIGH_VALUE: '💰',
  PAYMENT_DELAY: '💳',
  COMPLIANCE: '📋',
  LEGAL: '⚖️',
};

const SEVERITY_LABELS: Record<string, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
};

export function RiskAlertList({ alerts, onDismiss }: RiskAlertListProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: '#b91c1c' };
      case 'MEDIUM':
        return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', badge: '#b45309' };
      case 'LOW':
        return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', badge: '#15803d' };
      default:
        return { bg: '#f3f4f6', border: '#e5e7eb', text: '#6b7280', badge: '#4b5563' };
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN');
  };

  const getContractLink = (alert: RiskAlert) => {
    return `/contracts/${alert.contractId}`;
  };

  return (
    <div style={styles.container}>
      {alerts.map((alert) => {
        const severityColors = getSeverityColor(alert.severity);
        const icon = ALERT_TYPE_ICONS[alert.alertType] || '⚠️';
        const typeLabel = ALERT_TYPE_LABELS[alert.alertType] || alert.alertType;
        const severityLabel = SEVERITY_LABELS[alert.severity] || alert.severity;

        return (
          <div
            key={alert.id}
            style={{
              ...styles.alertCard,
              backgroundColor: severityColors.bg,
              borderColor: severityColors.border,
            }}
          >
            {/* Icon and Type */}
            <div style={styles.alertHeader}>
              <div style={styles.alertInfo}>
                <span style={styles.alertIcon}>{icon}</span>
                <div>
                  <span style={styles.alertType}>{typeLabel}</span>
                  <span
                    style={{
                      ...styles.severityBadge,
                      backgroundColor: severityColors.badge,
                      color: '#fff',
                    }}
                  >
                    {severityLabel}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {onDismiss && (
                <div style={styles.actions}>
                  <Link
                    to={getContractLink(alert)}
                    style={{
                      ...styles.actionButton,
                      color: '#3b82f6',
                      borderColor: '#bfdbfe',
                    }}
                  >
                    查看详情
                  </Link>
                  <button
                    onClick={() => onDismiss(alert.id)}
                    style={{
                      ...styles.actionButton,
                      color: '#6b7280',
                      borderColor: '#e5e7eb',
                    }}
                    type="button"
                  >
                    忽略
                  </button>
                </div>
              )}
            </div>

            {/* Message */}
            <p style={{ ...styles.message, color: severityColors.text }}>
              {alert.message}
            </p>

            {/* Meta */}
            <div style={styles.meta}>
              <span style={styles.metaLabel}>预警ID:</span>
              <span style={styles.metaValue}>{alert.id}</span>
              <span style={styles.metaDivider}>•</span>
              <span style={styles.metaLabel}>生成时间:</span>
              <span style={styles.metaValue}>{formatDate(alert.createdAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertCard: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid',
    backgroundColor: '#fff',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  alertInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  alertIcon: {
    fontSize: '24px',
  },
  alertType: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
    marginRight: '8px',
  },
  severityBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '4px',
  },
  message: {
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0 0 12px 0',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#6b7280',
  },
  metaLabel: {
    color: '#9ca3af',
  },
  metaValue: {
    color: '#6b7280',
  },
  metaDivider: {
    margin: '0 8px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '13px',
    backgroundColor: '#fff',
    border: '1px solid',
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
};

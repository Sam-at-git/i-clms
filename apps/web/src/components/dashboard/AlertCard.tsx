import { Alert } from './AlertList';

interface AlertCardProps {
  title: string;
  alerts: Alert[];
  type?: 'high' | 'medium' | 'low' | 'pending' | 'all';
  onClick?: () => void;
  drillDownPath?: string;
}

export function AlertCard({ title, alerts, type, onClick, drillDownPath }: AlertCardProps) {
  const filteredAlerts = type
    ? alerts.filter((alert) => {
        if (['high', 'medium', 'low'].includes(type)) {
          return alert.level === type && alert.status === 'pending';
        }
        if (type === 'pending') {
          return alert.status === 'pending';
        }
        return true;
      })
    : alerts;

  const pendingCount = filteredAlerts.filter((a) => a.status === 'pending').length;
  const highPriorityCount = filteredAlerts.filter((a) => a.level === 'high' && a.status === 'pending').length;

  const handleClick = () => {
    if (drillDownPath) {
      window.location.href = drillDownPath;
    }
    onClick?.();
  };

  const getBackgroundColor = () => {
    if (type === 'high') return '#fef2f2';
    if (type === 'medium') return '#fffbeb';
    if (type === 'low') return '#eff6ff';
    return '#f9fafb';
  };

  const getBorderColor = () => {
    if (type === 'high') return '#fecaca';
    if (type === 'medium') return '#fde68a';
    if (type === 'low') return '#bfdbfe';
    return '#e5e7eb';
  };

  const getIcon = () => {
    if (type === 'high' || highPriorityCount > 0) return '🔴';
    if (type === 'medium') return '🟡';
    if (type === 'low') return '🔵';
    return '🔔';
  };

  return (
    <div
      style={{
        ...styles.card,
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        ...(drillDownPath && styles.clickable),
      }}
      onClick={handleClick}
      title={drillDownPath ? '点击查看详情' : ''}
    >
      <div style={styles.header}>
        <span style={styles.icon}>{getIcon()}</span>
        <h3 style={styles.title}>{title}</h3>
      </div>

      <div style={styles.counts}>
        <div style={styles.countItem}>
          <span style={styles.countValue}>{pendingCount}</span>
          <span style={styles.countLabel}>待处理</span>
        </div>

        {highPriorityCount > 0 && (
          <div style={styles.countItem}>
            <span style={{ ...styles.countValue, color: '#ef4444' }}>{highPriorityCount}</span>
            <span style={styles.countLabel}>高优先级</span>
          </div>
        )}
      </div>

      {filteredAlerts.length > 0 && (
        <div style={styles.preview}>
          {filteredAlerts.slice(0, 3).map((alert) => (
            <div key={alert.id} style={styles.previewItem}>
              <div
                style={{
                  ...styles.previewDot,
                  backgroundColor: alert.level === 'high' ? '#ef4444' : alert.level === 'medium' ? '#f59e0b' : '#3b82f6',
                }}
              />
              <span style={styles.previewText}>{alert.title}</span>
            </div>
          ))}
          {filteredAlerts.length > 3 && (
            <div style={styles.previewMore}>还有 {filteredAlerts.length - 3} 条...</div>
          )}
        </div>
      )}

      {pendingCount === 0 && filteredAlerts.length > 0 && (
        <div style={styles.allClear}>
          <span style={styles.checkmark}>✓</span>
          <span style={styles.allClearText}>全部已处理</span>
        </div>
      )}

      {filteredAlerts.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyText}>暂无提醒</span>
        </div>
      )}
    </div>
  );
}

interface AlertStatsGridProps {
  alerts: Alert[];
  onCardClick?: (type: string) => void;
  getDrillDownPath?: (type: string) => string;
}

export function AlertStatsGrid({ alerts, onCardClick, getDrillDownPath }: AlertStatsGridProps) {
  const stats = {
    total: alerts.length,
    pending: alerts.filter((a) => a.status === 'pending').length,
    high: alerts.filter((a) => a.level === 'high' && a.status === 'pending').length,
    medium: alerts.filter((a) => a.level === 'medium' && a.status === 'pending').length,
    low: alerts.filter((a) => a.level === 'low' && a.status === 'pending').length,
  };

  return (
    <div style={styles.grid}>
      <AlertCard
        title="全部提醒"
        alerts={alerts}
        onClick={() => onCardClick?.('all')}
        drillDownPath={getDrillDownPath?.('all')}
      />
      <AlertCard
        title="待处理"
        alerts={alerts}
        type="pending"
        onClick={() => onCardClick?.('pending')}
        drillDownPath={getDrillDownPath?.('pending')}
      />
      <AlertCard
        title="高优先级"
        alerts={alerts}
        type="high"
        onClick={() => onCardClick?.('high')}
        drillDownPath={getDrillDownPath?.('high')}
      />
      <AlertCard
        title="中优先级"
        alerts={alerts}
        type="medium"
        onClick={() => onCardClick?.('medium')}
        drillDownPath={getDrillDownPath?.('medium')}
      />
      <AlertCard
        title="低优先级"
        alerts={alerts}
        type="low"
        onClick={() => onCardClick?.('low')}
        drillDownPath={getDrillDownPath?.('low')}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  clickable: {
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  icon: {
    fontSize: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  counts: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  countItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  countValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1,
  },
  countLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderTop: '1px solid rgba(0,0,0,0.05)',
    paddingTop: '12px',
  },
  previewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  previewDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  previewText: {
    fontSize: '13px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  previewMore: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: '4px',
  },
  allClear: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '6px',
  },
  checkmark: {
    fontSize: '18px',
    color: '#10b981',
  },
  allClearText: {
    fontSize: '13px',
    color: '#10b981',
    fontWeight: 500,
  },
  empty: {
    textAlign: 'center',
    padding: '12px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#9ca3af',
  },
};

export default AlertCard;

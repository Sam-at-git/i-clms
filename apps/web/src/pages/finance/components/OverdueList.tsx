import { Link } from 'react-router-dom';

interface OverdueAlert {
  contractId: string;
  contractNo: string;
  customerName: string;
  expectedDate: string;
  daysOverdue: number;
  amount: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface OverdueListProps {
  alerts: OverdueAlert[];
}

const levelConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  LOW: { label: '低', color: '#059669', bgColor: '#d1fae5' },
  MEDIUM: { label: '中', color: '#d97706', bgColor: '#fef3c7' },
  HIGH: { label: '高', color: '#dc2626', bgColor: '#fee2e2' },
  CRITICAL: { label: '严重', color: '#991b1b', bgColor: '#fecaca' },
};

export function OverdueList({ alerts }: OverdueListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  if (alerts.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>逾期预警</h3>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24">
              <path
                stroke="#9ca3af"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p style={styles.emptyText}>暂无逾期预警</p>
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.level === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.level === 'HIGH').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>逾期预警</h3>
        <div style={styles.summary}>
          {criticalCount > 0 && (
            <span style={{ ...styles.badge, ...styles.criticalBadge }}>
              严重: {criticalCount}
            </span>
          )}
          {highCount > 0 && (
            <span style={{ ...styles.badge, ...styles.highBadge }}>
              高: {highCount}
            </span>
          )}
          <span style={styles.totalCount}>共 {alerts.length} 条</span>
        </div>
      </div>
      <div style={styles.list}>
        {alerts.map((alert) => {
          const config = levelConfig[alert.level];
          return (
            <Link
              key={`${alert.contractId}-${alert.expectedDate}`}
              to={`/contracts/${alert.contractId}`}
              style={styles.itemLink}
            >
              <div style={styles.item}>
                <div style={styles.itemHeader}>
                  <span style={styles.contractNo}>{alert.contractNo}</span>
                  <span
                    style={{
                      ...styles.levelBadge,
                      color: config.color,
                      backgroundColor: config.bgColor,
                    }}
                  >
                    {config.label}
                  </span>
                </div>
                <div style={styles.itemInfo}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>客户</span>
                    <span style={styles.infoValue}>{alert.customerName}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>预期日期</span>
                    <span style={styles.infoValue}>{formatDate(alert.expectedDate)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>逾期天数</span>
                    <span style={{ ...styles.infoValue, color: config.color, fontWeight: 600 }}>
                      {alert.daysOverdue} 天
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>涉及金额</span>
                    <span style={styles.infoValue}>{formatCurrency(alert.amount)}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  criticalBadge: {
    backgroundColor: '#fecaca',
    color: '#991b1b',
  },
  highBadge: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  totalCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  itemLink: {
    textDecoration: 'none',
    display: 'block',
  },
  item: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  contractNo: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
  },
  levelBadge: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  itemInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  infoRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoLabel: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  infoValue: {
    fontSize: '13px',
    color: '#374151',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
};

export default OverdueList;

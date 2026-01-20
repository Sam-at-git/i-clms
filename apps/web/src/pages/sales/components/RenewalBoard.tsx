import { Link } from 'react-router-dom';

interface RenewalItem {
  contractId: string;
  contractNo: string;
  customerName: string;
  amount: number;
  expiresAt: string;
  daysUntilExpiry: number;
  renewalProbability: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RenewalBoardProps {
  expiringThisMonth: number;
  expiringThisQuarter: number;
  totalRenewalValue: number;
  renewalRate: number;
  renewalItems: RenewalItem[];
}

const priorityConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  HIGH: { label: '高', color: '#dc2626', bgColor: '#fee2e2' },
  MEDIUM: { label: '中', color: '#d97706', bgColor: '#fef3c7' },
  LOW: { label: '低', color: '#059669', bgColor: '#d1fae5' },
};

export function RenewalBoard({
  expiringThisMonth,
  expiringThisQuarter,
  totalRenewalValue,
  renewalRate,
  renewalItems,
}: RenewalBoardProps) {
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>续约看板</h3>
        <div style={styles.headerStats}>
          <div style={styles.headerStat}>
            <span style={styles.headerValue}>{renewalRate.toFixed(1)}%</span>
            <span style={styles.headerLabel}>续约率</span>
          </div>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>
            {expiringThisMonth}
          </div>
          <div style={styles.statLabel}>本月到期</div>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>
            {expiringThisQuarter}
          </div>
          <div style={styles.statLabel}>本季度到期</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{formatCurrency(totalRenewalValue)}</div>
          <div style={styles.statLabel}>待续约总额</div>
        </div>
      </div>

      <div style={styles.list}>
        <div style={styles.listHeader}>
          <div style={styles.listHeaderCell}>合同</div>
          <div style={styles.listHeaderCell}>客户</div>
          <div style={styles.listHeaderCell}>金额</div>
          <div style={styles.listHeaderCell}>到期日</div>
          <div style={styles.listHeaderCell}>剩余</div>
          <div style={styles.listHeaderCell}>概率</div>
          <div style={styles.listHeaderCell}>优先级</div>
        </div>
        {renewalItems.slice(0, 10).map((item) => {
          const config = priorityConfig[item.priority];
          return (
            <Link
              key={item.contractId}
              to={`/contracts/${item.contractId}`}
              style={styles.listItemLink}
            >
              <div style={styles.listItem}>
                <div style={styles.listCell}>{item.contractNo}</div>
                <div style={styles.listCell}>{item.customerName}</div>
                <div style={styles.listCell}>{formatCurrency(item.amount)}</div>
                <div style={styles.listCell}>{formatDate(item.expiresAt)}</div>
                <div
                  style={{
                    ...styles.listCell,
                    color: item.daysUntilExpiry <= 30 ? '#ef4444' : '#374151',
                    fontWeight: item.daysUntilExpiry <= 30 ? 600 : 400,
                  }}
                >
                  {item.daysUntilExpiry} 天
                </div>
                <div style={styles.listCell}>
                  <div style={styles.probability}>
                    <div
                      style={{
                        ...styles.probabilityBar,
                        width: `${item.renewalProbability}%`,
                        backgroundColor:
                          item.renewalProbability >= 80
                            ? '#10b981'
                            : item.renewalProbability >= 60
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    />
                  </div>
                  <span style={styles.probabilityText}>
                    {item.renewalProbability.toFixed(0)}%
                  </span>
                </div>
                <div style={styles.listCell}>
                  <span
                    style={{
                      ...styles.priorityTag,
                      color: config.color,
                      backgroundColor: config.bgColor,
                    }}
                  >
                    {config.label}
                  </span>
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
    marginBottom: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  headerStats: {
    display: 'flex',
    gap: '16px',
  },
  headerStat: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  headerValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#10b981',
  },
  headerLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  statItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  listHeader: {
    display: 'grid',
    gridTemplateColumns: '100px 120px 100px 90px 60px 80px 60px',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
  },
  listHeaderCell: {},
  listItemLink: {
    textDecoration: 'none',
    display: 'block',
  },
  listItem: {
    display: 'grid',
    gridTemplateColumns: '100px 120px 100px 90px 60px 80px 60px',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '13px',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  listCell: {
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  probability: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
    display: 'inline-block',
    width: '40px',
    marginRight: '4px',
    verticalAlign: 'middle',
  },
  probabilityBar: {
    height: '100%',
    borderRadius: '3px',
  },
  probabilityText: {
    fontSize: '11px',
    color: '#6b7280',
  },
  priorityTag: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 500,
  },
};

export default RenewalBoard;

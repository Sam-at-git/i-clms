import { Link } from 'react-router-dom';

interface MilestoneItem {
  id: string;
  name: string;
  contractNo: string;
  customerName: string;
  plannedDate: string | null;
  actualDate: string | null;
  status: string;
  amount: number | null;
  daysOverdue: number | null;
  // For navigation
  contractId?: string;
}

interface MilestoneTrackerProps {
  totalMilestones: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  upcomingMilestones: MilestoneItem[];
  overdueMilestones: MilestoneItem[];
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: '待开始', color: '#6b7280', bgColor: '#f3f4f6' },
  IN_PROGRESS: { label: '进行中', color: '#3b82f6', bgColor: '#dbeafe' },
  DELIVERED: { label: '已交付', color: '#f59e0b', bgColor: '#fef3c7' },
  ACCEPTED: { label: '已验收', color: '#10b981', bgColor: '#d1fae5' },
  REJECTED: { label: '被拒绝', color: '#ef4444', bgColor: '#fee2e2' },
};

export function MilestoneTracker({
  totalMilestones,
  completedCount,
  pendingCount,
  overdueCount,
  upcomingMilestones,
  overdueMilestones,
}: MilestoneTrackerProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div style={styles.container}>
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{totalMilestones}</div>
          <div style={styles.statLabel}>总里程碑</div>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{completedCount}</div>
          <div style={styles.statLabel}>已完成</div>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>{pendingCount}</div>
          <div style={styles.statLabel}>进行中</div>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{overdueCount}</div>
          <div style={styles.statLabel}>已逾期</div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Overdue Milestones */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <span style={styles.warningIcon}>!</span>
            逾期里程碑
          </h3>
          {overdueMilestones.length === 0 ? (
            <div style={styles.empty}>暂无逾期里程碑</div>
          ) : (
            <div style={styles.list}>
              {overdueMilestones.slice(0, 5).map((milestone) => (
                <div key={milestone.id} style={styles.milestoneItem}>
                  <div style={styles.milestoneHeader}>
                    <span style={styles.milestoneName}>{milestone.name}</span>
                    <span style={styles.overdueTag}>
                      逾期 {milestone.daysOverdue} 天
                    </span>
                  </div>
                  <div style={styles.milestoneInfo}>
                    {milestone.contractId ? (
                      <Link
                        to={`/contracts/${milestone.contractId}`}
                        style={styles.contractLink}
                      >
                        {milestone.contractNo}
                      </Link>
                    ) : (
                      <span>{milestone.contractNo}</span>
                    )}
                    <span>{milestone.customerName}</span>
                    <span>{formatDate(milestone.plannedDate)}</span>
                    <span>{formatCurrency(milestone.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Milestones */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>即将到期</h3>
          {upcomingMilestones.length === 0 ? (
            <div style={styles.empty}>暂无即将到期的里程碑</div>
          ) : (
            <div style={styles.list}>
              {upcomingMilestones.slice(0, 5).map((milestone) => {
                const config = statusConfig[milestone.status] || statusConfig.PENDING;
                return (
                  <div key={milestone.id} style={styles.milestoneItem}>
                    <div style={styles.milestoneHeader}>
                      <span style={styles.milestoneName}>{milestone.name}</span>
                      <span
                        style={{
                          ...styles.statusTag,
                          color: config.color,
                          backgroundColor: config.bgColor,
                        }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <div style={styles.milestoneInfo}>
                      {milestone.contractId ? (
                        <Link
                          to={`/contracts/${milestone.contractId}`}
                          style={styles.contractLink}
                        >
                          {milestone.contractNo}
                        </Link>
                      ) : (
                        <span>{milestone.contractNo}</span>
                      )}
                      <span>{milestone.customerName}</span>
                      <span>{formatDate(milestone.plannedDate)}</span>
                      <span>{formatCurrency(milestone.amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  statItem: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  warningIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    backgroundColor: '#ef4444',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: 700,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  milestoneItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  milestoneName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  overdueTag: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '4px',
    fontWeight: 500,
  },
  statusTag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  milestoneInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    fontSize: '12px',
    color: '#6b7280',
  },
  contractLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  } as any,
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
};

export default MilestoneTracker;

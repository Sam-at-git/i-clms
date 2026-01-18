interface StatusCount {
  status: string;
  count: number;
}

interface CustomerProjects {
  customerId: string;
  customerName: string;
  projectCount: number;
  activeCount: number;
}

interface ProjectMapProps {
  totalProjects: number;
  byStatus: StatusCount[];
  byCustomer: CustomerProjects[];
  completionRate: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草拟', color: '#9ca3af' },
  PENDING_APPROVAL: { label: '审批中', color: '#f59e0b' },
  ACTIVE: { label: '已生效', color: '#10b981' },
  EXECUTING: { label: '执行中', color: '#3b82f6' },
  COMPLETED: { label: '已完结', color: '#6366f1' },
  TERMINATED: { label: '已终止', color: '#ef4444' },
  EXPIRED: { label: '已过期', color: '#6b7280' },
};

export function ProjectMap({
  totalProjects,
  byStatus,
  byCustomer,
  completionRate,
}: ProjectMapProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalProjects}</div>
          <div style={styles.statLabel}>总项目数</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{completionRate.toFixed(1)}%</div>
          <div style={styles.statLabel}>完成率</div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Status Distribution */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>项目状态分布</h3>
          <div style={styles.statusList}>
            {byStatus.map((item) => {
              const config = statusLabels[item.status] || {
                label: item.status,
                color: '#6b7280',
              };
              return (
                <div key={item.status} style={styles.statusItem}>
                  <div
                    style={{
                      ...styles.statusDot,
                      backgroundColor: config.color,
                    }}
                  />
                  <span style={styles.statusLabel}>{config.label}</span>
                  <span style={styles.statusCount}>{item.count}</span>
                  <div style={styles.statusBar}>
                    <div
                      style={{
                        ...styles.statusBarFill,
                        backgroundColor: config.color,
                        width: `${(item.count / totalProjects) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Projects */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>客户项目分布</h3>
          <div style={styles.customerList}>
            {byCustomer.slice(0, 8).map((customer) => (
              <div key={customer.customerId} style={styles.customerItem}>
                <div style={styles.customerName}>{customer.customerName}</div>
                <div style={styles.customerStats}>
                  <span style={styles.customerTotal}>
                    {customer.projectCount} 项目
                  </span>
                  <span style={styles.customerActive}>
                    {customer.activeCount} 进行中
                  </span>
                </div>
              </div>
            ))}
          </div>
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
  header: {
    display: 'flex',
    gap: '16px',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    borderRadius: '12px',
    padding: '24px',
    color: '#fff',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
  },
  statusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  statusItem: {
    display: 'grid',
    gridTemplateColumns: '12px 80px 40px 1fr',
    alignItems: 'center',
    gap: '12px',
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#374151',
  },
  statusCount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
    textAlign: 'right',
  },
  statusBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  customerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  customerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  customerName: {
    fontSize: '14px',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '150px',
  },
  customerStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
  },
  customerTotal: {
    color: '#6b7280',
  },
  customerActive: {
    color: '#10b981',
    fontWeight: 500,
  },
};

export default ProjectMap;

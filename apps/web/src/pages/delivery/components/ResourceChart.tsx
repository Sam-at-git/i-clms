interface RoleUtilization {
  role: string;
  count: number;
  totalValue: number;
}

interface MonthlyUtilization {
  month: string;
  hoursAllocated: number;
  value: number;
}

interface ResourceChartProps {
  totalStaffContracts: number;
  byRole: RoleUtilization[];
  monthlyTrend: MonthlyUtilization[];
}

export function ResourceChart({
  totalStaffContracts,
  byRole,
  monthlyTrend,
}: ResourceChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxHours = Math.max(...monthlyTrend.map((m) => m.hoursAllocated), 1);
  const maxRoleCount = Math.max(...byRole.map((r) => r.count), 1);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>资源利用率</h3>
        <div style={styles.headerStat}>
          <span style={styles.headerValue}>{totalStaffContracts}</span>
          <span style={styles.headerLabel}>活跃人力合同</span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Role Distribution */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>角色分布</h4>
          <div style={styles.roleList}>
            {byRole.map((item) => (
              <div key={item.role} style={styles.roleItem}>
                <div style={styles.roleInfo}>
                  <span style={styles.roleName}>{item.role}</span>
                  <span style={styles.roleCount}>{item.count} 人</span>
                </div>
                <div style={styles.roleBar}>
                  <div
                    style={{
                      ...styles.roleBarFill,
                      width: `${(item.count / maxRoleCount) * 100}%`,
                    }}
                  />
                </div>
                <div style={styles.roleValue}>{formatCurrency(item.totalValue)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>月度工时趋势</h4>
          <div style={styles.chart}>
            {monthlyTrend.map((item) => (
              <div key={item.month} style={styles.chartItem}>
                <div style={styles.chartBar}>
                  <div
                    style={{
                      ...styles.chartBarFill,
                      height: `${(item.hoursAllocated / maxHours) * 100}%`,
                    }}
                  />
                </div>
                <div style={styles.chartLabel}>{item.month.slice(5)}</div>
              </div>
            ))}
          </div>
          <div style={styles.chartTable}>
            <div style={styles.tableHeader}>
              <div>月份</div>
              <div>工时</div>
              <div>价值</div>
            </div>
            {monthlyTrend.map((item) => (
              <div key={item.month} style={styles.tableRow}>
                <div>{item.month}</div>
                <div>{item.hoursAllocated} 小时</div>
                <div>{formatCurrency(item.value)}</div>
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
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  headerStat: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  headerValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#3b82f6',
  },
  headerLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  card: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 16px 0',
  },
  roleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  roleItem: {
    display: 'grid',
    gridTemplateColumns: '1fr 100px 100px',
    alignItems: 'center',
    gap: '12px',
  },
  roleInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleName: {
    fontSize: '13px',
    color: '#374151',
  },
  roleCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
  roleBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  roleBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  roleValue: {
    fontSize: '12px',
    color: '#374151',
    textAlign: 'right',
  },
  chart: {
    display: 'flex',
    gap: '8px',
    height: '120px',
    alignItems: 'flex-end',
    padding: '0 0 8px 0',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '16px',
  },
  chartItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  chartBar: {
    flex: 1,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chartBarFill: {
    width: '60%',
    maxWidth: '30px',
    backgroundColor: '#10b981',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s ease',
  },
  chartLabel: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  chartTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    padding: '4px 0',
    color: '#9ca3af',
    fontWeight: 500,
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    padding: '4px 0',
    color: '#374151',
  },
};

export default ResourceChart;

interface MonthlyRevenue {
  month: string;
  amount: number;
  count: number;
}

interface TypeRevenue {
  type: string;
  amount: number;
  percentage: number;
}

interface CustomerRevenue {
  customerId: string;
  customerName: string;
  amount: number;
  contractCount: number;
}

interface RevenueChartProps {
  totalRevenue: number;
  byMonth: MonthlyRevenue[];
  byContractType: TypeRevenue[];
  byCustomer: CustomerRevenue[];
}

const typeLabels: Record<string, string> = {
  STAFF_AUGMENTATION: '人力框架',
  PROJECT_OUTSOURCING: '项目外包',
  PRODUCT_SALES: '产品购销',
};

export function RevenueChart({
  totalRevenue,
  byMonth,
  byContractType,
  byCustomer,
}: RevenueChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxMonthAmount = Math.max(...byMonth.map((m) => m.amount), 1);

  return (
    <div style={styles.container}>
      <div style={styles.totalCard}>
        <div style={styles.totalLabel}>总收入</div>
        <div style={styles.totalAmount}>{formatCurrency(totalRevenue)}</div>
      </div>

      <div style={styles.chartsGrid}>
        {/* Monthly Revenue */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>月度收入趋势</h3>
          <div style={styles.barChart}>
            {byMonth.map((item) => (
              <div key={item.month} style={styles.barItem}>
                <div style={styles.barLabel}>{item.month}</div>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${(item.amount / maxMonthAmount) * 100}%`,
                    }}
                  />
                </div>
                <div style={styles.barValue}>{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Type Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>合同类型分布</h3>
          <div style={styles.pieList}>
            {byContractType.map((item) => (
              <div key={item.type} style={styles.pieItem}>
                <div style={styles.pieDot} />
                <div style={styles.pieLabel}>{typeLabels[item.type] || item.type}</div>
                <div style={styles.pieValue}>{formatCurrency(item.amount)}</div>
                <div style={styles.piePercent}>{item.percentage.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>客户收入排名 (Top 5)</h3>
          <div style={styles.rankList}>
            {byCustomer.slice(0, 5).map((item, index) => (
              <div key={item.customerId} style={styles.rankItem}>
                <div style={styles.rankNumber}>{index + 1}</div>
                <div style={styles.rankName}>{item.customerName}</div>
                <div style={styles.rankValue}>{formatCurrency(item.amount)}</div>
                <div style={styles.rankCount}>{item.contractCount}份</div>
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
  totalCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: '12px',
    padding: '32px',
    color: '#fff',
    textAlign: 'center',
  },
  totalLabel: {
    fontSize: '14px',
    opacity: 0.8,
    marginBottom: '8px',
  },
  totalAmount: {
    fontSize: '36px',
    fontWeight: 700,
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  barChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  barItem: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 100px',
    alignItems: 'center',
    gap: '8px',
  },
  barLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  barContainer: {
    height: '12px',
    backgroundColor: '#e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  barValue: {
    fontSize: '12px',
    color: '#374151',
    textAlign: 'right',
  },
  pieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  pieItem: {
    display: 'grid',
    gridTemplateColumns: '12px 1fr auto auto',
    alignItems: 'center',
    gap: '12px',
  },
  pieDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
  },
  pieLabel: {
    fontSize: '14px',
    color: '#374151',
  },
  pieValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  piePercent: {
    fontSize: '12px',
    color: '#6b7280',
    minWidth: '50px',
    textAlign: 'right',
  },
  rankList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  rankItem: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr auto auto',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  rankNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
  },
  rankName: {
    fontSize: '14px',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rankValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  rankCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default RevenueChart;

interface CashFlowForecast {
  month: string;
  expectedIncome: number;
  receivedAmount: number;
  pendingAmount: number;
}

interface CashFlowChartProps {
  data: CashFlowForecast[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxAmount = Math.max(...data.map((d) => d.expectedIncome), 1);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>现金流预测 (未来6个月)</h3>
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#10b981' }} />
          <span>已收款</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#f59e0b' }} />
          <span>待收款</span>
        </div>
      </div>
      <div style={styles.chart}>
        {data.map((item) => (
          <div key={item.month} style={styles.barGroup}>
            <div style={styles.barWrapper}>
              <div style={styles.stackedBar}>
                <div
                  style={{
                    ...styles.receivedBar,
                    height: `${(item.receivedAmount / maxAmount) * 100}%`,
                  }}
                />
                <div
                  style={{
                    ...styles.pendingBar,
                    height: `${(item.pendingAmount / maxAmount) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div style={styles.barLabel}>{item.month}</div>
          </div>
        ))}
      </div>
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div>月份</div>
          <div>预期收入</div>
          <div>已收款</div>
          <div>待收款</div>
        </div>
        {data.map((item) => (
          <div key={item.month} style={styles.tableRow}>
            <div style={styles.tableCell}>{item.month}</div>
            <div style={styles.tableCell}>{formatCurrency(item.expectedIncome)}</div>
            <div style={{ ...styles.tableCell, color: '#10b981' }}>
              {formatCurrency(item.receivedAmount)}
            </div>
            <div style={{ ...styles.tableCell, color: '#f59e0b' }}>
              {formatCurrency(item.pendingAmount)}
            </div>
          </div>
        ))}
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
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6b7280',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  chart: {
    display: 'flex',
    gap: '8px',
    height: '200px',
    alignItems: 'flex-end',
    padding: '16px 0',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '16px',
  },
  barGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  stackedBar: {
    width: '60%',
    maxWidth: '40px',
    display: 'flex',
    flexDirection: 'column-reverse',
    borderRadius: '4px 4px 0 0',
    overflow: 'hidden',
  },
  receivedBar: {
    backgroundColor: '#10b981',
    transition: 'height 0.3s ease',
  },
  pendingBar: {
    backgroundColor: '#f59e0b',
    transition: 'height 0.3s ease',
  },
  barLabel: {
    fontSize: '11px',
    color: '#6b7280',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    padding: '8px',
    fontSize: '13px',
    borderBottom: '1px solid #f3f4f6',
  },
  tableCell: {
    color: '#374151',
  },
};

export default CashFlowChart;

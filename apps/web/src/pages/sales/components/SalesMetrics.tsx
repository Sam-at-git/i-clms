interface SalesPersonPerformance {
  salesPerson: string;
  totalContracts: number;
  totalValue: number;
  newSignValue: number;
  renewalValue: number;
}

interface MonthlySales {
  month: string;
  newSignValue: number;
  renewalValue: number;
  totalValue: number;
}

interface SalesMetricsProps {
  totalSalesValue: number;
  newSignValue: number;
  renewalValue: number;
  monthlyTrend: MonthlySales[];
  bySalesPerson: SalesPersonPerformance[];
}

export function SalesMetrics({
  totalSalesValue,
  newSignValue,
  renewalValue,
  monthlyTrend,
  bySalesPerson,
}: SalesMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompact = (amount: number) => {
    if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(1)}千万`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}万`;
    }
    return formatCurrency(amount);
  };

  const maxMonthValue = Math.max(...monthlyTrend.map((m) => m.totalValue), 1);
  const maxPersonValue = Math.max(...bySalesPerson.map((p) => p.totalValue), 1);

  return (
    <div style={styles.container}>
      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{formatCurrency(totalSalesValue)}</div>
          <div style={styles.summaryLabel}>年度销售总额</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: '#3b82f6' }}>
            {formatCurrency(newSignValue)}
          </div>
          <div style={styles.summaryLabel}>新签金额</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: '#10b981' }}>
            {formatCurrency(renewalValue)}
          </div>
          <div style={styles.summaryLabel}>续签金额</div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Monthly Trend */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>月度销售趋势</h3>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#3b82f6' }} />
              <span>新签</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#10b981' }} />
              <span>续签</span>
            </div>
          </div>
          <div style={styles.chart}>
            {monthlyTrend.map((item) => (
              <div key={item.month} style={styles.chartItem}>
                <div style={styles.chartBars}>
                  <div
                    style={{
                      ...styles.chartBar,
                      height: `${(item.newSignValue / maxMonthValue) * 100}%`,
                      backgroundColor: '#3b82f6',
                    }}
                    title={`新签: ${formatCurrency(item.newSignValue)}`}
                  />
                  <div
                    style={{
                      ...styles.chartBar,
                      height: `${(item.renewalValue / maxMonthValue) * 100}%`,
                      backgroundColor: '#10b981',
                    }}
                    title={`续签: ${formatCurrency(item.renewalValue)}`}
                  />
                </div>
                <div style={styles.chartLabel}>{item.month.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales Person Ranking */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>销售业绩排名</h3>
          <div style={styles.rankList}>
            {bySalesPerson.slice(0, 8).map((person, index) => (
              <div key={person.salesPerson} style={styles.rankItem}>
                <div style={styles.rankNumber}>{index + 1}</div>
                <div style={styles.rankInfo}>
                  <div style={styles.rankName}>{person.salesPerson}</div>
                  <div style={styles.rankMeta}>
                    {person.totalContracts} 份合同
                  </div>
                </div>
                <div style={styles.rankBar}>
                  <div
                    style={{
                      ...styles.rankBarFill,
                      width: `${(person.totalValue / maxPersonValue) * 100}%`,
                    }}
                  />
                </div>
                <div style={styles.rankValue}>{formatCompact(person.totalValue)}</div>
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
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  summaryCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: '12px',
    padding: '24px',
    color: '#fff',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#fff',
  },
  summaryLabel: {
    fontSize: '13px',
    opacity: 0.8,
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
    width: '10px',
    height: '10px',
    borderRadius: '2px',
  },
  chart: {
    display: 'flex',
    gap: '4px',
    height: '160px',
    alignItems: 'flex-end',
    padding: '0 0 8px 0',
  },
  chartItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    height: '100%',
  },
  chartBars: {
    flex: 1,
    width: '100%',
    display: 'flex',
    gap: '2px',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chartBar: {
    width: '40%',
    maxWidth: '16px',
    borderRadius: '2px 2px 0 0',
    transition: 'height 0.3s ease',
  },
  chartLabel: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  rankList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  rankItem: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr 100px 80px',
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
  rankInfo: {},
  rankName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  rankMeta: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  rankBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  rankValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1f2937',
    textAlign: 'right',
  },
};

export default SalesMetrics;

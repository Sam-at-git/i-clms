import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { RevenueChart, CashFlowChart, OverdueList } from './components';

const REVENUE_STATS_QUERY = gql`
  query RevenueStats($filter: RevenueFilterInput) {
    revenueStats(filter: $filter) {
      totalRevenue
      byMonth {
        month
        amount
        count
      }
      byContractType {
        type
        amount
        percentage
      }
      byCustomer {
        customerId
        customerName
        amount
        contractCount
      }
    }
  }
`;

const CASH_FLOW_QUERY = gql`
  query CashFlowForecast($months: Int) {
    cashFlowForecast(months: $months) {
      month
      expectedIncome
      receivedAmount
      pendingAmount
    }
  }
`;

const OVERDUE_ALERTS_QUERY = gql`
  query OverdueAlerts {
    overdueAlerts {
      contractId
      contractNo
      customerName
      expectedDate
      daysOverdue
      amount
      level
    }
  }
`;

export function FinancePage() {
  const currentYear = new Date().getFullYear();

  const {
    data: revenueData,
    loading: revenueLoading,
    error: revenueError,
  } = useQuery(REVENUE_STATS_QUERY, {
    variables: { filter: { year: currentYear } },
  });

  const {
    data: cashFlowData,
    loading: cashFlowLoading,
    error: cashFlowError,
  } = useQuery(CASH_FLOW_QUERY, {
    variables: { months: 6 },
  });

  const {
    data: overdueData,
    loading: overdueLoading,
    error: overdueError,
  } = useQuery(OVERDUE_ALERTS_QUERY);

  if (revenueLoading || cashFlowLoading || overdueLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (revenueError || cashFlowError || overdueError) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>加载数据时出错</p>
          <p style={styles.errorDetail}>
            {revenueError?.message ||
              cashFlowError?.message ||
              overdueError?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>财务仪表盘</h1>
        <p style={styles.subtitle}>{currentYear}年度财务概览</p>
      </div>

      <div style={styles.content}>
        <section style={styles.section}>
          <RevenueChart
            totalRevenue={revenueData?.revenueStats?.totalRevenue || 0}
            byMonth={revenueData?.revenueStats?.byMonth || []}
            byContractType={revenueData?.revenueStats?.byContractType || []}
            byCustomer={revenueData?.revenueStats?.byCustomer || []}
          />
        </section>

        <div style={styles.twoColumn}>
          <section style={styles.section}>
            <CashFlowChart data={cashFlowData?.cashFlowForecast || []} />
          </section>

          <section style={styles.section}>
            <OverdueList alerts={overdueData?.overdueAlerts || []} />
          </section>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    flex: 1,
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#6b7280',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#dc2626',
  },
  errorDetail: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default FinancePage;

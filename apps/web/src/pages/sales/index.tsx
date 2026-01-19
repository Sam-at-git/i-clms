import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Customer360, RenewalBoard, SalesMetrics } from './components';

const CUSTOMER_OVERVIEW_QUERY = gql`
  query CustomerOverview {
    customerOverview {
      totalCustomers
      activeCustomers
      newCustomersThisYear
      byIndustry {
        industry
        count
        totalValue
      }
      topCustomers {
        customerId
        customerName
        totalContracts
        totalValue
        activeContracts
        industry
      }
    }
  }
`;

const RENEWAL_OVERVIEW_QUERY = gql`
  query RenewalOverview {
    renewalOverview {
      expiringThisMonth
      expiringThisQuarter
      totalRenewalValue
      renewalRate
      renewalItems {
        contractId
        contractNo
        customerName
        amount
        expiresAt
        daysUntilExpiry
        renewalProbability
        priority
      }
    }
  }
`;

const SALES_PERFORMANCE_QUERY = gql`
  query SalesPerformance($year: Int) {
    salesPerformance(year: $year) {
      totalSalesValue
      newSignValue
      renewalValue
      monthlyTrend {
        month
        newSignValue
        renewalValue
        totalValue
      }
      bySalesPerson {
        salesPerson
        totalContracts
        totalValue
        newSignValue
        renewalValue
      }
    }
  }
`;

interface CustomerOverviewResult {
  customerOverview: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomersThisYear: number;
    byIndustry: Array<{ industry: string; count: number; totalValue: number }>;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      totalContracts: number;
      totalValue: number;
      activeContracts: number;
      industry: string;
    }>;
  };
}

interface RenewalOverviewResult {
  renewalOverview: {
    expiringThisMonth: number;
    expiringThisQuarter: number;
    totalRenewalValue: number;
    renewalRate: number;
    renewalItems: Array<{
      contractId: string;
      contractNo: string;
      customerName: string;
      amount: number;
      expiresAt: string;
      daysUntilExpiry: number;
      renewalProbability: number;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
    }>;
  };
}

interface SalesPerformanceResult {
  salesPerformance: {
    totalSalesValue: number;
    newSignValue: number;
    renewalValue: number;
    monthlyTrend: Array<{
      month: string;
      newSignValue: number;
      renewalValue: number;
      totalValue: number;
    }>;
    bySalesPerson: Array<{
      salesPerson: string;
      totalContracts: number;
      totalValue: number;
      newSignValue: number;
      renewalValue: number;
    }>;
  };
}

export function SalesPage() {
  const currentYear = new Date().getFullYear();

  const {
    data: customerData,
    loading: customerLoading,
    error: customerError,
  } = useQuery<CustomerOverviewResult>(CUSTOMER_OVERVIEW_QUERY);

  const {
    data: renewalData,
    loading: renewalLoading,
    error: renewalError,
  } = useQuery<RenewalOverviewResult>(RENEWAL_OVERVIEW_QUERY);

  const {
    data: salesData,
    loading: salesLoading,
    error: salesError,
  } = useQuery<SalesPerformanceResult>(SALES_PERFORMANCE_QUERY, {
    variables: { year: currentYear },
  });

  if (customerLoading || renewalLoading || salesLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (customerError || renewalError || salesError) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>加载数据时出错</p>
          <p style={styles.errorDetail}>
            {customerError?.message ||
              renewalError?.message ||
              salesError?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>销售仪表盘</h1>
        <p style={styles.subtitle}>{currentYear}年度销售业绩概览</p>
      </div>

      <div style={styles.content}>
        <section style={styles.section}>
          <SalesMetrics
            totalSalesValue={salesData?.salesPerformance?.totalSalesValue || 0}
            newSignValue={salesData?.salesPerformance?.newSignValue || 0}
            renewalValue={salesData?.salesPerformance?.renewalValue || 0}
            monthlyTrend={salesData?.salesPerformance?.monthlyTrend || []}
            bySalesPerson={salesData?.salesPerformance?.bySalesPerson || []}
          />
        </section>

        <section style={styles.section}>
          <Customer360
            totalCustomers={customerData?.customerOverview?.totalCustomers || 0}
            activeCustomers={customerData?.customerOverview?.activeCustomers || 0}
            newCustomersThisYear={
              customerData?.customerOverview?.newCustomersThisYear || 0
            }
            byIndustry={customerData?.customerOverview?.byIndustry || []}
            topCustomers={customerData?.customerOverview?.topCustomers || []}
          />
        </section>

        <section style={styles.section}>
          <RenewalBoard
            expiringThisMonth={
              renewalData?.renewalOverview?.expiringThisMonth || 0
            }
            expiringThisQuarter={
              renewalData?.renewalOverview?.expiringThisQuarter || 0
            }
            totalRenewalValue={
              renewalData?.renewalOverview?.totalRenewalValue || 0
            }
            renewalRate={renewalData?.renewalOverview?.renewalRate || 0}
            renewalItems={renewalData?.renewalOverview?.renewalItems || []}
          />
        </section>
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
    gap: '32px',
  },
  section: {
    flex: 1,
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

export default SalesPage;

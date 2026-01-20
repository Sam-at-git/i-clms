import { Link } from 'react-router-dom';

interface IndustryCount {
  industry: string;
  count: number;
  totalValue: number;
}

interface Customer360Item {
  customerId: string;
  customerName: string;
  totalContracts: number;
  totalValue: number;
  activeContracts: number;
  industry: string | null;
}

interface Customer360Props {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisYear: number;
  byIndustry: IndustryCount[];
  topCustomers: Customer360Item[];
}

export function Customer360({
  totalCustomers,
  activeCustomers,
  newCustomersThisYear,
  byIndustry,
  topCustomers,
}: Customer360Props) {
  const formatCurrency = (amount: number) => {
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
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalCustomers}</div>
          <div style={styles.statLabel}>总客户数</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#10b981' }}>
            {activeCustomers}
          </div>
          <div style={styles.statLabel}>活跃客户</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>
            {newCustomersThisYear}
          </div>
          <div style={styles.statLabel}>本年新客户</div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Industry Distribution */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>行业分布</h3>
          <div style={styles.industryList}>
            {byIndustry.slice(0, 8).map((item) => (
              <div key={item.industry} style={styles.industryItem}>
                <div style={styles.industryInfo}>
                  <span style={styles.industryName}>{item.industry}</span>
                  <span style={styles.industryCount}>{item.count} 客户</span>
                </div>
                <div style={styles.industryValue}>
                  {formatCurrency(item.totalValue)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>重点客户 (Top 10)</h3>
          <div style={styles.customerList}>
            {topCustomers.map((customer, index) => (
              <Link
                key={customer.customerId}
                to={`/customers/${customer.customerId}`}
                style={styles.customerItemLink}
              >
                <div style={styles.customerItem}>
                  <div style={styles.customerRank}>{index + 1}</div>
                  <div style={styles.customerInfo}>
                    <div style={styles.customerName}>{customer.customerName}</div>
                    <div style={styles.customerMeta}>
                      <span>{customer.totalContracts} 份合同</span>
                      <span>{customer.activeContracts} 进行中</span>
                      {customer.industry && (
                        <span style={styles.industryTag}>
                          {customer.industry}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={styles.customerValue}>
                    {formatCurrency(customer.totalValue)}
                  </div>
                </div>
              </Link>
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
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '13px',
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
  },
  industryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  industryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  industryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  industryName: {
    fontSize: '14px',
    color: '#374151',
  },
  industryCount: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  industryValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  customerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  customerItemLink: {
    textDecoration: 'none',
    display: 'block',
  },
  customerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  customerRank: {
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
    flexShrink: 0,
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  customerMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  industryTag: {
    padding: '1px 6px',
    backgroundColor: '#dbeafe',
    color: '#3b82f6',
    borderRadius: '4px',
  },
  customerValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
    flexShrink: 0,
  },
};

export default Customer360;

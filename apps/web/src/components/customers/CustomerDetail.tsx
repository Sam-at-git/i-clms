import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useParams, Link } from 'react-router-dom';
import { Breadcrumb } from '../navigation/Breadcrumb';
import { ContactList } from './ContactList';
import { CustomerContracts } from './CustomerContracts';
import { CustomerStatsCard } from './CustomerStatsCard';

const GET_CUSTOMER = gql`
  query GetCustomerById($id: ID!) {
    customer(id: $id) {
      id
      name
      shortName
      creditCode
      industry
      status
      contactPerson
      contactPhone
      contactEmail
      address
      createdAt
      updatedAt
      contacts {
        id
        name
        title
        phone
        email
        isPrimary
        createdAt
        updatedAt
      }
      contracts {
        id
        contractNo
        name
        type
        status
        amountWithTax
        currency
        signedAt
      }
    }
  }
`;

const GET_CUSTOMER_STATS = gql`
  query GetCustomerStatsById($id: ID!) {
    customerStats(id: $id) {
      totalContracts
      activeContracts
      totalValue
      averageContractValue
      firstContractDate
      lastContractDate
      lifetimeValueScore
      isActive
    }
  }
`;

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();

  const { loading, error, data, refetch } = useQuery(GET_CUSTOMER, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const { data: statsData } = useQuery(GET_CUSTOMER_STATS, {
    variables: { id },
    skip: !id,
  });

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>错误: {error.message}</div>;
  if (!(data as any)?.customer) return <div style={styles.notFound}>客户不存在</div>;

  const customer = (data as any).customer;
  const stats = (statsData as any)?.customerStats;

  return (
    <div style={styles.container}>
      <Breadcrumb />

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{customer.name}</h1>
          <div style={styles.subtitle}>
            <span style={styles.shortName}>{customer.shortName || '无简称'}</span>
            <span style={styles.separator}>|</span>
            <span style={styles.status}>{formatStatus(customer.status)}</span>
          </div>
        </div>
        <div style={styles.headerActions}>
          <Link to="/customers" style={styles.backButton}>
            ← 返回列表
          </Link>
        </div>
      </div>

      {stats && (
        <div style={styles.statsGrid}>
          <CustomerStatsCard
            title="合同总数"
            value={stats.totalContracts.toString()}
            icon="📄"
          />
          <CustomerStatsCard
            title="活跃合同"
            value={stats.activeContracts.toString()}
            icon="🔄"
          />
          <CustomerStatsCard
            title="总金额"
            value={formatCurrency(stats.totalValue)}
            icon="💰"
          />
          <CustomerStatsCard
            title="平均合同额"
            value={formatCurrency(stats.averageContractValue)}
            icon="📊"
          />
          <CustomerStatsCard
            title="生命周期价值"
            value={formatCurrency(stats.lifetimeValueScore)}
            icon="⭐"
          />
        </div>
      )}

      <div style={styles.mainGrid}>
        <div style={styles.leftColumn}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>基本信息</h2>
            <div style={styles.fieldGrid}>
              <Field label="客户名称" value={customer.name} />
              <Field label="客户简称" value={customer.shortName} />
              <Field label="信用代码" value={customer.creditCode} />
              <Field label="所属行业" value={customer.industry} />
              <Field label="状态" value={formatStatus(customer.status)} />
              <Field label="地址" value={customer.address} />
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>联系方式</h2>
            <div style={styles.fieldGrid}>
              <Field label="联系人" value={customer.contactPerson} />
              <Field label="联系电话" value={customer.contactPhone} />
              <Field label="联系邮箱" value={customer.contactEmail} />
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>系统信息</h2>
            <div style={styles.fieldGrid}>
              <Field label="创建时间" value={formatDateTime(customer.createdAt)} />
              <Field label="更新时间" value={formatDateTime(customer.updatedAt)} />
            </div>
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>联系人</h2>
              <span style={styles.contactCount}>
                {customer.contacts?.length || 0} 人
              </span>
            </div>
            <ContactList
              customerId={customer.id}
              contacts={customer.contacts || []}
              onUpdate={() => refetch()}
            />
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>合同历史</h2>
            <CustomerContracts contracts={customer.contracts || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={fieldStyles.field}>
      <dt style={fieldStyles.label}>{label}</dt>
      <dd style={fieldStyles.value}>{value || '-'}</dd>
    </div>
  );
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: '活跃',
    INACTIVE: '非活跃',
    ARCHIVED: '已归档',
  };
  return statusMap[status] || status;
}

function formatCurrency(value: number): string {
  return `¥ ${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN');
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  backButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#6b7280',
  },
  shortName: {
    fontWeight: 500,
  },
  separator: {
    color: '#d1d5db',
  },
  status: {
    color: '#10b981',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 16px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  contactCount: {
    fontSize: '14px',
    color: '#6b7280',
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#ef4444',
  },
  notFound: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
};

const fieldStyles: Record<string, React.CSSProperties> = {
  field: {
    margin: 0,
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  value: {
    fontSize: '14px',
    color: '#111827',
    margin: 0,
  },
};

export default CustomerDetail;

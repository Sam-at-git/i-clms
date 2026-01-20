import { useState, useEffect } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

const GET_CUSTOMERS = gql`
  query GetCustomerList($filter: CustomerFilterInput) {
    customers(filter: $filter) {
      items {
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
      }
      total
      hasMore
    }
  }
`;

const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '活跃',
  INACTIVE: '非活跃',
  ARCHIVED: '已归档',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  INACTIVE: '#f59e0b',
  ARCHIVED: '#9ca3af',
};

interface CustomerListProps {
  search?: string;
  industry?: string;
  status?: string;
  refreshKey?: number;
}

export function CustomerList({ search, industry, status, refreshKey }: CustomerListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { loading, error, data, refetch } = useQuery(GET_CUSTOMERS, {
    variables: {
      filter: {
        search,
        industry,
        status,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  // Refetch data when refreshKey changes
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  if (loading && !data) {
    return (
      <div style={styles.container}>
        <Skeleton variant="text" count={5} />
      </div>
    );
  }

  if (error) {
    return <div style={styles.error}>错误: {error.message}</div>;
  }

  const customers = (data as any)?.customers?.items || [];
  const total = (data as any)?.customers?.total || 0;

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c: any) => c.id)));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>客户列表</h3>
        <span style={styles.stats}>共 {total} 家客户</span>
      </div>

      {selectedIds.size > 0 && (
        <div style={styles.batchActions}>
          <span style={styles.batchCount}>已选择 {selectedIds.size} 项</span>
        </div>
      )}

      {!loading && customers.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="暂无客户"
          description="点击上方按钮添加新客户"
        />
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === customers.length && customers.length > 0}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>客户名称</th>
                <th style={styles.th}>简称</th>
                <th style={styles.th}>行业</th>
                <th style={styles.th}>联系人</th>
                <th style={styles.th}>联系电话</th>
                <th style={styles.th}>状态</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer: any) => (
                <tr key={customer.id} style={styles.tr}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(customer.id)}
                      onChange={() => toggleSelect(customer.id)}
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={styles.td}>
                    <Link to={`/customers/${customer.id}`} style={styles.link}>
                      {customer.name}
                    </Link>
                  </td>
                  <td style={styles.td}>{customer.shortName || '-'}</td>
                  <td style={styles.td}>{customer.industry || '-'}</td>
                  <td style={styles.td}>{customer.contactPerson || '-'}</td>
                  <td style={styles.td}>{customer.contactPhone || '-'}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: STATUS_COLORS[customer.status] || '#6b7280',
                      }}
                    >
                      {CUSTOMER_STATUS_LABELS[customer.status] || customer.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <Link to={`/customers/${customer.id}`} style={styles.actionLink}>
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  stats: {
    fontSize: '14px',
    color: '#6b7280',
  },
  batchActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: '16px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
  },
  batchCount: {
    fontSize: '14px',
    color: '#1e40af',
    fontWeight: 500,
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: '12px',
    textTransform: 'uppercase',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
  },
  checkbox: {
    margin: 0,
    cursor: 'pointer',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    borderRadius: '4px',
    color: '#fff',
  },
  actionLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#ef4444',
    fontSize: '14px',
  },
};

export default CustomerList;

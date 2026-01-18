import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';

const GET_CONTRACTS = gql`
  query GetContracts($skip: Int, $take: Int) {
    contracts(skip: $skip, take: $take) {
      nodes {
        id
        contractNo
        name
        type
        status
        ourEntity
        amountWithTax
        currency
        signedAt
        parseStatus
        customer {
          id
          name
          shortName
        }
        department {
          id
          name
        }
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`;

interface Contract {
  id: string;
  contractNo: string;
  name: string;
  type: string;
  status: string;
  ourEntity: string;
  amountWithTax: string;
  currency: string;
  signedAt: string | null;
  parseStatus: string;
  customer: {
    id: string;
    name: string;
    shortName: string | null;
  };
  department: {
    id: string;
    name: string;
  };
}

interface ContractsData {
  contracts: {
    nodes: Contract[];
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  STAFF_AUGMENTATION: '人力框架',
  PROJECT_OUTSOURCING: '项目外包',
  PRODUCT_SALES: '产品购销',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草拟',
  PENDING_APPROVAL: '审批中',
  ACTIVE: '已生效',
  EXECUTING: '执行中',
  COMPLETED: '已完结',
  TERMINATED: '已终止',
  EXPIRED: '已过期',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING_APPROVAL: '#f59e0b',
  ACTIVE: '#10b981',
  EXECUTING: '#3b82f6',
  COMPLETED: '#6366f1',
  TERMINATED: '#ef4444',
  EXPIRED: '#9ca3af',
};

export function ContractList() {
  const { loading, error, data, fetchMore } = useQuery<ContractsData>(
    GET_CONTRACTS,
    {
      variables: { skip: 0, take: 20 },
    }
  );

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>错误: {error.message}</div>;
  if (!data) return <div style={styles.empty}>无数据</div>;

  const { nodes, totalCount, hasNextPage } = data.contracts;

  const loadMore = () => {
    fetchMore({
      variables: {
        skip: nodes.length,
        take: 20,
      },
    });
  };

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    return `${currency === 'CNY' ? '¥' : currency} ${num.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>合同列表</h1>
        <div style={styles.stats}>
          共 {totalCount} 份合同
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>合同编号</th>
              <th style={styles.th}>合同名称</th>
              <th style={styles.th}>类型</th>
              <th style={styles.th}>客户</th>
              <th style={styles.th}>金额</th>
              <th style={styles.th}>签订日期</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((contract) => (
              <tr key={contract.id} style={styles.tr}>
                <td style={styles.td}>
                  <Link to={`/contracts/${contract.id}`} style={styles.link}>
                    {contract.contractNo}
                  </Link>
                </td>
                <td style={styles.td}>{contract.name}</td>
                <td style={styles.td}>
                  <span style={styles.badge}>
                    {CONTRACT_TYPE_LABELS[contract.type] || contract.type}
                  </span>
                </td>
                <td style={styles.td}>
                  {contract.customer.shortName || contract.customer.name}
                </td>
                <td style={styles.tdRight}>
                  {formatAmount(contract.amountWithTax, contract.currency)}
                </td>
                <td style={styles.td}>{formatDate(contract.signedAt)}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: STATUS_COLORS[contract.status] || '#6b7280',
                    }}
                  >
                    {CONTRACT_STATUS_LABELS[contract.status] || contract.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <Link to={`/contracts/${contract.id}`} style={styles.actionLink}>
                    查看
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div style={styles.loadMore}>
          <button onClick={loadMore} style={styles.loadMoreButton}>
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  stats: {
    color: '#6b7280',
    fontSize: '14px',
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
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
  },
  tdRight: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
    textAlign: 'right',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    color: '#374151',
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
  loadMore: {
    textAlign: 'center',
    padding: '24px',
  },
  loadMoreButton: {
    padding: '8px 24px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default ContractList;

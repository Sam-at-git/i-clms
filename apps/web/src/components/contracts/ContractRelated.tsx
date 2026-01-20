import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';

const GET_RELATED_CONTRACTS = gql`
  query GetRelatedContracts($customerId: String, $departmentId: String, $excludeId: String) {
    contracts(
      filter: { customerId: $customerId, departmentId: $departmentId }
      take: 10
    ) {
      nodes {
        id
        contractNo
        name
        type
        status
        amountWithTax
        currency
        signedAt
        customer {
          id
          name
          shortName
        }
      }
    }
  }
`;

interface ContractRelatedProps {
  customerId?: string;
  departmentId?: string;
  currentContractId: string;
}

export function ContractRelated({
  customerId,
  departmentId,
  currentContractId,
}: ContractRelatedProps) {
  const { loading, error, data } = useQuery(GET_RELATED_CONTRACTS, {
    variables: {
      customerId,
      departmentId,
      excludeId: currentContractId,
    },
    fetchPolicy: 'cache-and-network',
    skip: !customerId && !departmentId,
  });

  const contractsData = data as any;
  const relatedContracts = contractsData?.contracts?.nodes?.filter(
    (c: any) => c.id !== currentContractId
  ) || [];

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>加载失败: {error.message}</div>;
  if (!relatedContracts.length) return null;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>相关合同</h3>
      <div style={styles.list}>
        {relatedContracts.map((contract: any) => (
          <Link
            key={contract.id}
            to={`/contracts/${contract.id}`}
            style={styles.contractCard}
          >
            <div style={styles.contractHeader}>
              <span style={styles.contractNo}>{contract.contractNo}</span>
              <span style={styles.contractType}>{formatType(contract.type)}</span>
            </div>
            <div style={styles.contractName}>{contract.name}</div>
            <div style={styles.contractInfo}>
              <span style={styles.contractCustomer}>
                {contract.customer.shortName || contract.customer.name}
              </span>
              <span style={styles.contractAmount}>
                {formatAmount(contract.amountWithTax, contract.currency)}
              </span>
            </div>
            <div style={styles.contractMeta}>
              <span style={getStatusStyle(contract.status)}>
                {formatStatus(contract.status)}
              </span>
              <span style={styles.contractDate}>
                {formatDate(contract.signedAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatType(type: string): string {
  const typeMap: Record<string, string> = {
    STAFF_AUGMENTATION: '人力框架',
    PROJECT_OUTSOURCING: '项目外包',
    PRODUCT_SALES: '产品购销',
  };
  return typeMap[type] || type;
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: '草拟',
    PENDING_APPROVAL: '审批中',
    ACTIVE: '已生效',
    EXECUTING: '执行中',
    COMPLETED: '已完结',
    TERMINATED: '已终止',
    EXPIRED: '已过期',
  };
  return statusMap[status] || status;
}

function getStatusStyle(status: string): React.CSSProperties {
  const colorMap: Record<string, string> = {
    DRAFT: '#6b7280',
    PENDING_APPROVAL: '#f59e0b',
    ACTIVE: '#10b981',
    EXECUTING: '#3b82f6',
    COMPLETED: '#6366f1',
    TERMINATED: '#ef4444',
    EXPIRED: '#9ca3af',
  };
  return {
    fontSize: '12px',
    padding: '2px 8px',
    backgroundColor: colorMap[status] || '#6b7280',
    color: '#fff',
    borderRadius: '4px',
  };
}

function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '-';
  return `${currency === 'CNY' ? '¥' : currency} ${num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 16px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  error: {
    padding: '24px',
    textAlign: 'center',
    color: '#ef4444',
    fontSize: '14px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contractCard: {
    display: 'block',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  contractHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  contractNo: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  contractType: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  contractName: {
    fontSize: '14px',
    color: '#1f2937',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  contractInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  contractCustomer: {
    fontSize: '13px',
    color: '#6b7280',
  },
  contractAmount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  contractMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
};

export default ContractRelated;

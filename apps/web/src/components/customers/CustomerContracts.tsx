import { Link } from 'react-router-dom';

interface Contract {
  id: string;
  contractNo: string;
  name: string;
  type: string;
  status: string;
  amountWithTax: string;
  currency: string;
  signedAt: string | null;
}

interface CustomerContractsProps {
  contracts: Contract[];
}

export function CustomerContracts({ contracts }: CustomerContractsProps) {
  if (contracts.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyText}>暂无合同记录</div>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {contracts.map((contract) => (
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
            <span style={styles.contractAmount}>
              {formatAmount(contract.amountWithTax, contract.currency)}
            </span>
            <span style={styles.contractDate}>
              {formatDate(contract.signedAt)}
            </span>
          </div>
          <div style={styles.contractStatus}>
            <span style={getStatusStyle(contract.status)}>
              {formatStatus(contract.status)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function formatType(type: string): string {
  const typeMap: Record<string, string> = {
    STAFF_AUGMENTATION: '人力',
    PROJECT_OUTSOURCING: '项目',
    PRODUCT_SALES: '产品',
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
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  contractType: {
    fontSize: '11px',
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    padding: '2px 6px',
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
  contractAmount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  contractDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  contractStatus: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
};

export default CustomerContracts;

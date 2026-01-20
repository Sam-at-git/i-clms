import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { ContractUpload } from './ContractUpload';
import { ContractDelete } from './ContractDelete';
import { ContractFilter } from './ContractFilter';
import { ContractSearch } from './ContractSearch';
import { ViewToggle, ViewMode } from './ViewToggle';
import { BatchActions } from './BatchActions';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useContractFilters } from '../../lib/filter-hooks';

const GET_CONTRACTS = gql`
  query GetContractsWithFilterAdvanced(
    $filter: ContractFilterInput
    $skip: Int
    $take: Int
    $orderBy: ContractOrderInput
  ) {
    contracts(filter: $filter, skip: $skip, take: $take, orderBy: $orderBy) {
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

export function ContractListEnhanced() {
  const [showUpload, setShowUpload] = useState(false);
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());

  const { filters } = useContractFilters();

  // Build filter object for GraphQL
  const graphQLFilter = {
    types: filters.types?.length ? filters.types : undefined,
    statuses: filters.statuses?.length ? filters.statuses : undefined,
    customerId: filters.customerId,
    departmentId: filters.departmentId,
    signedAfter: filters.signedAfter ? new Date(filters.signedAfter) : undefined,
    signedBefore: filters.signedBefore ? new Date(filters.signedBefore) : undefined,
    search: filters.search,
  };

  const { loading, error, data, fetchMore, refetch } = useQuery<ContractsData>(
    GET_CONTRACTS,
    {
      variables: {
        filter: graphQLFilter,
        skip: 0,
        take: 20,
        orderBy: { field: 'SIGNED_AT', direction: 'DESC' },
      },
      fetchPolicy: 'cache-and-network',
    }
  );

  if (loading && !data) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>合同列表</h1>
        </div>
        <Skeleton variant="text" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>合同列表</h1>
        </div>
        <div style={styles.error}>错误: {error.message}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>合同列表</h1>
        </div>
        <EmptyState
          icon="📄"
          title="暂无数据"
          description="请上传合同或调整筛选条件"
        />
      </div>
    );
  }

  const { nodes, totalCount, hasNextPage } = data.contracts;

  const loadMore = () => {
    fetchMore({
      variables: {
        skip: nodes.length,
        take: 20,
      },
    });
  };

  const toggleSelectContract = (id: string) => {
    const newSelected = new Set(selectedContracts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContracts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedContracts.size === nodes.length) {
      setSelectedContracts(new Set());
    } else {
      setSelectedContracts(new Set(nodes.map((c) => c.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedContracts(new Set());
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
        <div style={styles.headerRight}>
          <span style={styles.stats}>共 {totalCount} 份合同</span>
          <ViewToggle onViewChange={setViewMode} />
          <button
            onClick={() => setShowUpload(true)}
            style={styles.uploadButton}
          >
            + 上传合同
          </button>
        </div>
      </div>

      {/* Search */}
      <ContractSearch />

      {/* Filter */}
      <ContractFilter onFilterChange={() => refetch()} />

      {/* Batch Actions */}
      <BatchActions
        selectedIds={Array.from(selectedContracts)}
        onClearSelection={handleClearSelection}
        onRefresh={() => refetch()}
        totalCount={totalCount}
      />

      {/* Loading indicator */}
      {loading && <Skeleton variant="rectangular" height={200} count={1} />}

      {/* Contracts List/Card View */}
      {!loading && nodes.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="未找到匹配的合同"
          description="请调整筛选条件或清除所有筛选"
        />
      ) : viewMode === 'list' ? (
        renderListView()
      ) : (
        renderCardView()
      )}

      {/* Load More */}
      {hasNextPage && !loading && (
        <div style={styles.loadMore}>
          <button onClick={loadMore} style={styles.loadMoreButton}>
            加载更多
          </button>
        </div>
      )}

      {/* Modals */}
      {showUpload && (
        <ContractUpload
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            refetch();
          }}
        />
      )}

      {deleteContract && (
        <ContractDelete
          contractId={deleteContract.id}
          contractNo={deleteContract.contractNo}
          contractName={deleteContract.name}
          onClose={() => setDeleteContract(null)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );

  function renderListView() {
    return (
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>
                <input
                  type="checkbox"
                  checked={selectedContracts.size === nodes.length && nodes.length > 0}
                  onChange={toggleSelectAll}
                  style={styles.checkbox}
                />
              </th>
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
                  <input
                    type="checkbox"
                    checked={selectedContracts.has(contract.id)}
                    onChange={() => toggleSelectContract(contract.id)}
                    style={styles.checkbox}
                  />
                </td>
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
                  <div style={styles.actions}>
                    <Link to={`/contracts/${contract.id}`} style={styles.actionLink}>
                      查看
                    </Link>
                    <button
                      onClick={() => setDeleteContract(contract)}
                      style={styles.deleteButton}
                      title="删除合同"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderCardView() {
    return (
      <div style={styles.cardGrid}>
        {nodes.map((contract) => (
          <div key={contract.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <input
                type="checkbox"
                checked={selectedContracts.has(contract.id)}
                onChange={() => toggleSelectContract(contract.id)}
                style={styles.checkbox}
              />
              <span
                style={{
                  ...styles.cardStatusBadge,
                  backgroundColor: STATUS_COLORS[contract.status] || '#6b7280',
                }}
              >
                {CONTRACT_STATUS_LABELS[contract.status] || contract.status}
              </span>
            </div>
            <Link
              to={`/contracts/${contract.id}`}
              style={styles.cardTitle}
            >
              {contract.name}
            </Link>
            <div style={styles.cardInfo}>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>编号：</span>
                <span style={styles.cardValue}>{contract.contractNo}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>类型：</span>
                <span style={styles.cardValue}>
                  {CONTRACT_TYPE_LABELS[contract.type] || contract.type}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>客户：</span>
                <span style={styles.cardValue}>
                  {contract.customer.shortName || contract.customer.name}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>金额：</span>
                <span style={styles.cardValue}>
                  {formatAmount(contract.amountWithTax, contract.currency)}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>签订日期：</span>
                <span style={styles.cardValue}>{formatDate(contract.signedAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  stats: {
    color: '#6b7280',
    fontSize: '14px',
  },
  uploadButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
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
  batchButtons: {
    display: 'flex',
    gap: '12px',
  },
  batchDeleteButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  batchExportButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
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
  checkbox: {
    margin: 0,
    cursor: 'pointer',
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
  actions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  actionLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '14px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'none',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  card: {
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardStatusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    borderRadius: '4px',
    color: '#fff',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '12px',
    display: 'block',
    textDecoration: 'none',
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cardRow: {
    display: 'flex',
    fontSize: '13px',
  },
  cardLabel: {
    color: '#6b7280',
    minWidth: '80px',
  },
  cardValue: {
    color: '#374151',
    flex: 1,
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#ef4444',
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

export default ContractListEnhanced;

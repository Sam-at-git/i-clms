import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { gql } from '@apollo/client';

const FIND_SIMILAR_CONTRACTS_QUERY = gql`
  query FindSimilarContracts($contractId: String!, $limit: Int) {
    findSimilarContracts(contractId: $contractId, limit: $limit) {
      contractId
      contractNo
      name
      customerName
      similarity
      matchReasons
    }
  }
`;

interface SimilarContract {
  contractId: string;
  contractNo: string;
  name: string;
  customerName: string;
  similarity: number;
  matchReasons: string[];
}

interface SimilarContractsData {
  findSimilarContracts: SimilarContract[];
}

interface SimilarContractsProps {
  contractId: string;
  limit?: number;
  title?: string;
  onContractClick?: () => void;
}

export function SimilarContracts({
  contractId,
  limit = 5,
  title = '相似合同推荐',
  onContractClick,
}: SimilarContractsProps) {
  const { loading, error, data } = useQuery<SimilarContractsData>(
    FIND_SIMILAR_CONTRACTS_QUERY,
    {
      variables: { contractId, limit },
      skip: !contractId,
      fetchPolicy: 'cache-and-network',
    }
  );

  const contracts = data?.findSimilarContracts || [];

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return '#dcfce7';
    if (similarity >= 0.6) return '#fef3c7';
    return '#fee2e2';
  };

  const getSimilarityTextColor = (similarity: number) => {
    if (similarity >= 0.8) return '#166534';
    if (similarity >= 0.6) return '#92400e';
    return '#991b1b';
  };

  if (!contractId) {
    return null;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>

      {loading && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span>正在分析相似合同...</span>
        </div>
      )}

      {error && (
        <div style={styles.error}>
          <span>⚠️ 加载失败</span>
        </div>
      )}

      {!loading && !error && contracts.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📄</div>
          <p style={styles.emptyText}>暂无相似合同</p>
        </div>
      )}

      {!loading && !error && contracts.length > 0 && (
        <div style={styles.list}>
          {contracts.map((contract) => (
            <Link
              key={contract.contractId}
              to={`/contracts/${contract.contractId}`}
              onClick={onContractClick}
              style={styles.item}
            >
              <div style={styles.itemHeader}>
                <div style={styles.itemInfo}>
                  <span style={styles.contractNo}>{contract.contractNo}</span>
                  <span style={styles.contractName}>{contract.name}</span>
                </div>
                <div
                  style={{
                    ...styles.similarityBadge,
                    backgroundColor: getSimilarityColor(contract.similarity),
                    color: getSimilarityTextColor(contract.similarity),
                  }}
                >
                  {(contract.similarity * 100).toFixed(0)}% 相似
                </div>
              </div>

              <div style={styles.customerInfo}>
                <span style={styles.customerLabel}>客户:</span>
                <span style={styles.customerName}>{contract.customerName}</span>
              </div>

              {contract.matchReasons && contract.matchReasons.length > 0 && (
                <div style={styles.reasons}>
                  <span style={styles.reasonsTitle}>相似原因:</span>
                  <div style={styles.reasonsList}>
                    {contract.matchReasons.map((reason, index) => (
                      <span key={index} style={styles.reasonBadge}>
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          ))}
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
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px',
    color: '#6b7280',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    '@keyframes spin': {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
  } as any,
  error: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '13px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    display: 'block',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  itemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  contractNo: {
    fontSize: '11px',
    color: '#6b7280',
  },
  contractName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  similarityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
  },
  customerInfo: {
    display: 'flex',
    gap: '6px',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  customerLabel: {
    color: '#9ca3af',
  },
  customerName: {
    color: '#374151',
  },
  reasons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  reasonsTitle: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  reasonsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  reasonBadge: {
    padding: '2px 6px',
    fontSize: '11px',
    color: '#0369a1',
    backgroundColor: '#dbeafe',
    borderRadius: '4px',
  },
};

export default SimilarContracts;

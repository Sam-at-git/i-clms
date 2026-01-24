import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

const GET_CONTRACT_VERSIONS = gql`
  query GetContractVersions($contractId: ID!) {
    contract(id: $contractId) {
      id
      contractNo
      name
      # Get audit history for this contract
      auditLogs(first: 50, orderBy: { timestamp: desc }) {
        nodes {
          id
          action
          timestamp
          userId
          changes {
            field
            oldValue
            newValue
          }
        }
      }
      # Get contract history if available
      history {
        id
        version
        changedAt
        changedBy {
          id
          name
        }
        changes {
          field
          oldValue
          newValue
        }
      }
    }
  }
`;

interface ContractVersionHistoryProps {
  contractId: string;
}

interface Version {
  id: string;
  version: string;
  timestamp: Date;
  changedBy: {
    id: string;
    name: string;
  } | null;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

const FIELD_LABELS: Record<string, string> = {
  contractNo: '合同编号',
  name: '合同名称',
  status: '状态',
  amountWithTax: '含税金额',
  paymentTerms: '付款条件',
  signedAt: '签订日期',
  effectiveAt: '生效日期',
  expiresAt: '到期日期',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  DRAFT: '#6b7280',
  PENDING_APPROVAL: '#f59e0b',
  COMPLETED: '#6366f1',
  TERMINATED: '#ef4444',
};

const formatFieldValue = (field: string, value: any): string => {
  if (value === null || value === undefined) return '-';

  if (field.includes('Date') || field.includes('At')) {
    return new Date(value).toLocaleDateString('zh-CN');
  }

  if (field.includes('Amount')) {
    return `¥${parseFloat(value || 0).toLocaleString()}`;
  }

  return String(value);
};

export function ContractVersionHistory({ contractId }: ContractVersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<Set<number>>(new Set());
  const [showDiffModal, setShowDiffModal] = useState(false);

  const { loading, error, data, refetch } = useQuery(GET_CONTRACT_VERSIONS, {
    variables: { contractId },
    fetchPolicy: 'cache-and-network',
  });

  // Transform audit logs to versions
  const versions: Version[] = data?.contract?.auditLogs?.nodes?.map((log: any, index: number) => ({
    id: log.id,
    version: `v${data.contract.auditLogs.nodes.length - index}`,
    timestamp: new Date(log.timestamp),
    changedBy: log.userId ? { id: log.userId, name: `用户 ${log.userId}` } : null,
    changes: log.changes || [],
  })) || [];

  const hasVersions = versions.length > 0;

  const handleVersionSelect = (index: number) => {
    const newSelected = new Set(selectedVersions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else if (newSelected.size < 2) {
      newSelected.add(index);
    } else {
      // If already 2 selected, replace the oldest
      const first = Array.from(newSelected)[0];
      newSelected.delete(first);
      newSelected.add(index);
    }
    setSelectedVersions(newSelected);
  };

  const handleCompareVersions = () => {
    if (selectedVersions.size === 2) {
      setShowDiffModal(true);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE: '创建',
      UPDATE: '更新',
      DELETE: '删除',
    };
    return labels[action] || action;
  };

  const getFieldLabel = (field: string) => {
    return FIELD_LABELS[field] || field;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>版本历史</h2>
        {selectedVersions.size === 2 && (
          <button
            onClick={handleCompareVersions}
            style={styles.compareButton}
          >
            对比选中版本
          </button>
        )}
      </div>

      {loading && (
        <div style={styles.loading}>加载中...</div>
      )}

      {error && (
        <div style={styles.error}>
          加载失败: {(error as Error).message}
        </div>
      )}

      {!loading && !hasVersions && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📋</div>
          <div style={styles.emptyText}>暂无版本历史记录</div>
          <div style={styles.emptySubtext}>
            合同的任何修改都会在这里显示
          </div>
        </div>
      )}

      {hasVersions && (
        <>
          {/* Timeline */}
          <div style={styles.timeline}>
            {versions.map((version, index) => (
              <div
                key={version.id}
                style={{
                  ...styles.timelineItem,
                  ...(selectedVersions.has(index) && styles.timelineItemSelected),
                }}
                onClick={() => handleVersionSelect(index)}
              >
                <div style={styles.timelineDotWrapper}>
                  <div style={styles.timelineDot} />
                  {index < versions.length - 1 && (
                    <div style={styles.timelineLine} />
                  )}
                </div>
                <div style={styles.timelineContent}>
                  <div style={styles.timelineHeader}>
                    <span style={styles.versionBadge}>{version.version}</span>
                    <span style={styles.actionLabel}>
                      {getActionLabel(version.changes[0]?.action || 'UPDATE')}
                    </span>
                    <span style={styles.timestamp}>
                      {version.timestamp.toLocaleString('zh-CN')}
                    </span>
                  </div>
                  {version.changedBy && (
                    <div style={styles.author}>
                      操作人: {version.changedBy.name}
                    </div>
                  )}

                  {/* Changed Fields Summary */}
                  <div style={styles.changesSummary}>
                    {version.changes.slice(0, 3).map((change, idx) => (
                      <span key={idx} style={styles.fieldTag}>
                        {getFieldLabel(change.field)}
                      </span>
                    ))}
                    {version.changes.length > 3 && (
                      <span style={styles.moreIndicator}>
                        +{version.changes.length - 3} 更多
                      </span>
                    )}
                  </div>

                  {selectedVersions.has(index) && (
                    <div style={styles.selectedIndicator}>✓ 已选择对比</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Version Details */}
          <div style={styles.detailsPanel}>
            {selectedVersions.size > 0 && (
              <div style={styles.selectionInfo}>
                <span style={styles.selectionText}>
                  已选择 {selectedVersions.size}/2 个版本进行对比
                </span>
                <button
                  onClick={() => setSelectedVersions(new Set())}
                  style={styles.clearButton}
                >
                  清除选择
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Diff Modal */}
      {showDiffModal && selectedVersions.size === 2 && (
        <div style={styles.modalOverlay} onClick={() => setShowDiffModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>版本对比</h3>
              <button
                onClick={() => setShowDiffModal(false)}
                style={styles.modalClose}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              {Array.from(selectedVersions).sort().map((index) => {
                const version = versions[index as number];
                return (
                  <div key={index} style={styles.versionPanel}>
                    <h4 style={styles.versionTitle}>{version.version}</h4>
                    <div style={styles.versionMeta}>
                      <span>{version.timestamp.toLocaleString('zh-CN')}</span>
                      {version.changedBy && (
                        <span>操作人: {version.changedBy.name}</span>
                      )}
                    </h4>

                    <table style={styles.diffTable}>
                      <thead>
                        <tr>
                          <th style={styles.diffTh}>字段</th>
                          <th style={styles.diffTh}>值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {version.changes.map((change, idx) => (
                          <tr key={idx}>
                            <td style={styles.diffTd}>{getFieldLabel(change.field)}</td>
                            <td style={styles.diffTdValue}>
                              {change.oldValue !== null && (
                                <span style={styles.oldValue}>
                                  {formatFieldValue(change.field, change.oldValue)}
                                </span>
                              )}
                              {change.oldValue !== null && change.newValue !== null && (
                                <span style={styles.arrow}>→</span>
                              )}
                              {change.newValue !== null && (
                                <span style={styles.newValue}>
                                  {formatFieldValue(change.field, change.newValue)}
                                </span>
                              )}
                              {change.oldValue === null && (
                                <span style={styles.newValue}>
                                  {formatFieldValue(change.field, change.newValue)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  compareButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: '6px',
    border: '1px solid #fecaca',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: 500,
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  timelineItemSelected: {
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
  },
  timelineDotWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    border: '3px solid #fff',
    boxShadow: '0 0 0 2px #dbeafe',
    flexShrink: 0,
    zIndex: 1,
  },
  timelineLine: {
    width: '2px',
    flex: 1,
    backgroundColor: '#e5e7eb',
    minHeight: '40px',
    marginTop: '4px',
  },
  timelineContent: {
    flex: 1,
    padding: '4px 0',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  versionBadge: {
    padding: '2px 8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '4px',
  },
  actionLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
  },
  timestamp: {
    fontSize: '12px',
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  author: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px',
  },
  changesSummary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  fieldTag: {
    padding: '2px 8px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '12px',
    borderRadius: '3px',
  },
  moreIndicator: {
    fontSize: '12px',
    color: '#6b7280',
  },
  selectedIndicator: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#3b82f6',
    fontWeight: 500,
  },
  detailsPanel: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  selectionInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionText: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
  },
  clearButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    maxWidth: '900px',
    width: '90%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  modalClose: {
    padding: '4px 8px',
    fontSize: '20px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  modalContent: {
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    gap: '20px',
  },
  versionPanel: {
    flex: 1,
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  versionTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
  },
  versionMeta: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
    display: 'flex',
    gap: '16px',
  },
  diffTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  diffTh: {
    padding: '8px 12px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    fontWeight: 500,
    color: '#6b7280',
    borderBottom: '1px solid #e5e7eb',
  },
  diffTd: {
    padding: '8px 12px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
    fontWeight: 500,
  },
  diffTdValue: {
    padding: '8px 12px',
    borderBottom: '1px solid #f3f4f6',
  },
  oldValue: {
    color: '#ef4444',
    textDecoration: 'line-through',
    marginRight: '8px',
  },
  newValue: {
    color: '#10b981',
    fontWeight: 600,
  },
  arrow: {
    color: '#9ca3af',
    margin: '0 4px',
  },
};

export default ContractVersionHistory;

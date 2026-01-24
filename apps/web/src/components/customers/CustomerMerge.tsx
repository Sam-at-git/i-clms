import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMERS } from '../../graphql/customers';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

interface CustomerMergeProps {
  onMerged?: (customerId: string) => void;
  onClose?: () => void;
}

const FIND_DUPLICATES = gql`
  query FindDuplicateCustomers($threshold: Float!) {
    findDuplicateCustomers(threshold: $threshold) {
      id
      name
      shortName
      creditCode
      industry
      status
      similarity
      matchReasons
      duplicates {
        id
        name
        shortName
        creditCode
        industry
        status
      }
    }
  }
`;

const MERGE_CUSTOMERS = gql`
  mutation MergeCustomers($primaryId: ID!, $duplicateIds: [ID!]!) {
    mergeCustomers(primaryId: $primaryId, duplicateIds: $duplicateIds) {
      id
      name
      mergedCount
    }
  }
`;

export function CustomerMerge({ onMerged, onClose }: CustomerMergeProps) {
  const [threshold, setThreshold] = useState(0.85);
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const { data, loading, refetch } = useQuery(FIND_DUPLICATES, {
    variables: { threshold },
    fetchPolicy: 'cache-and-network',
  });

  const [mergeCustomers, { loading: merging }] = useMutation(MERGE_CUSTOMERS, {
    onCompleted: (data) => {
      alert(`成功合并 ${data.mergeCustomers.mergedCount} 个客户`);
      if (onMerged) {
        onMerged(data.mergeCustomers.id);
      }
      setShowConfirm(false);
      setSelectedPrimary(null);
      setSelectedDuplicates(new Set());
      refetch();
    },
    onError: (error) => {
      alert(`合并失败: ${error.message}`);
    },
  });

  const duplicates = data?.findDuplicateCustomers || [];

  const handleSelectPrimary = (id: string) => {
    setSelectedPrimary(id);
    // Auto-select duplicates for this group
    const duplicate = duplicates.find((d: any) => d.id === id);
    if (duplicate) {
      const duplicateIds = duplicate.duplicates.map((d: any) => d.id);
      setSelectedDuplicates(new Set(duplicateIds));
    }
  };

  const handleMerge = () => {
    if (!selectedPrimary || selectedDuplicates.size === 0) return;

    mergeCustomers({
      variables: {
        primaryId: selectedPrimary,
        duplicateIds: Array.from(selectedDuplicates),
      },
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>客户合并</h3>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            ✕ 关闭
          </button>
        )}
      </div>

      {/* Threshold Control */}
      <div style={styles.thresholdSection}>
        <div style={styles.thresholdControl}>
          <label style={styles.thresholdLabel}>
            相似度阈值: {(threshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={threshold}
            onChange={(e) => {
              setThreshold(parseFloat(e.target.value));
              refetch();
            }}
            style={styles.thresholdSlider}
          />
          <div style={styles.thresholdLabels}>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
        <p style={styles.thresholdHelp}>
          较低的阈值会找到更多可能重复的客户
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>扫描中...</div>
      )}

      {/* No Duplicates */}
      {!loading && duplicates.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔍</div>
          <div style={styles.emptyText}>未发现重复客户</div>
          <div style={styles.emptySubtext}>
            尝试调整相似度阈值
          </div>
        </div>
      )}

      {/* Duplicate Groups */}
      {!loading && duplicates.length > 0 && (
        <>
          <div style={styles.summary}>
            发现 <strong>{duplicates.length}</strong> 组可能重复的客户
          </div>

          <div style={styles.duplicateGroups}>
            {duplicates.map((group: any) => (
              <div key={group.id} style={styles.groupCard}>
                {/* Primary Customer */}
                <div
                  style={{
                    ...styles.primaryCard,
                    ...(selectedPrimary === group.id && styles.cardSelected),
                  }}
                >
                  <div style={styles.cardHeader}>
                    <span style={styles.primaryBadge}>主记录</span>
                    <input
                      type="radio"
                      checked={selectedPrimary === group.id}
                      onChange={() => handleSelectPrimary(group.id)}
                      style={styles.radioButton}
                    />
                  </div>
                  <div style={styles.cardContent}>
                    <div style={styles.customerName}>{group.name}</div>
                    {group.shortName && (
                      <div style={styles.customerDetail}>{group.shortName}</div>
                    )}
                    {group.creditCode && (
                      <div style={styles.customerDetail}>
                        统一社会信用代码: {group.creditCode}
                      </div>
                    )}
                    <div style={styles.matchInfo}>
                      <span style={styles.matchLabel}>相似度:</span>
                      <span style={styles.matchValue}>
                        {(group.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div style={styles.matchReasons}>
                      <strong>匹配原因:</strong>
                      <ul style={styles.reasonsList}>
                        {group.matchReasons?.map((reason: string, idx: number) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Duplicate Customers */}
                <div style={styles.duplicatesList}>
                  {group.duplicates.map((duplicate: any) => (
                    <div
                      key={duplicate.id}
                      style={{
                        ...styles.duplicateCard,
                        ...(selectedDuplicates.has(duplicate.id) &&
                          styles.cardSelected),
                      }}
                    >
                      <div style={styles.cardHeader}>
                        <span style={styles.duplicateBadge}>重复</span>
                        <input
                          type="checkbox"
                          checked={selectedDuplicates.has(duplicate.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedDuplicates);
                            if (e.target.checked) {
                              newSelected.add(duplicate.id);
                            } else {
                              newSelected.delete(duplicate.id);
                            }
                            setSelectedDuplicates(newSelected);
                          }}
                          style={styles.checkbox}
                        />
                      </div>
                      <div style={styles.cardContent}>
                        <div style={styles.customerName}>{duplicate.name}</div>
                        {duplicate.shortName && (
                          <div style={styles.customerDetail}>{duplicate.shortName}</div>
                        )}
                        {duplicate.creditCode && (
                          <div style={styles.customerDetail}>
                            统一社会信用代码: {duplicate.creditCode}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Merge Actions */}
          {selectedPrimary && selectedDuplicates.size > 0 && (
            <div style={styles.actionsSection}>
              <div style={styles.selectionInfo}>
                已选择主客户: <strong>{duplicates.find((d: any) => d.id === selectedPrimary)?.name}</strong>
              </div>
              <div style={styles.selectionInfo}>
                已选择待合并客户: <strong>{selectedDuplicates.size} 个</strong>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                style={styles.mergeButton}
              >
                合并客户
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>确认合并</h3>
            <p style={styles.modalMessage}>
              确定要将 <strong>{selectedDuplicates.size}</strong> 个客户合并到主客户
              "{duplicates.find((d: any) => d.id === selectedPrimary)?.name}" 吗？
            </p>
            <p style={styles.modalWarning}>
              ⚠️ 此操作将保留主客户的所有合同和关联数据，被合并的客户将被标记为已删除。
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowConfirm(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleMerge}
                disabled={merging}
                style={styles.confirmButton}
              >
                {merging ? '合并中...' : '确认合并'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  closeButton: {
    padding: '6px 12px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  thresholdSection: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  thresholdControl: {
    maxWidth: '400px',
  },
  thresholdLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  thresholdSlider: {
    width: '100%',
    marginBottom: '8px',
  },
  thresholdLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6b7280',
  },
  thresholdHelp: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
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
  summary: {
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#1e40af',
  },
  duplicateGroups: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  groupCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#fff',
  },
  primaryCard: {
    border: '2px solid #3b82f6',
    marginBottom: '12px',
  },
  duplicatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  primaryBadge: {
    padding: '4px 8px',
    fontSize: '11px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    fontWeight: 500,
  },
  duplicateBadge: {
    padding: '4px 8px',
    fontSize: '11px',
    color: '#fff',
    backgroundColor: '#f59e0b',
    borderRadius: '4px',
    fontWeight: 500,
  },
  radioButton: {
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  cardContent: {
    fontSize: '14px',
  },
  customerName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px',
  },
  customerDetail: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  matchInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    fontSize: '13px',
  },
  matchLabel: {
    color: '#6b7280',
  },
  matchValue: {
    fontWeight: 600,
    color: '#111827',
  },
  matchReasons: {
    fontSize: '12px',
    color: '#6b7280',
  },
  reasonsList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#374151',
  },
  duplicateCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '12px',
    backgroundColor: '#fafafa',
  },
  actionsSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  selectionInfo: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '8px',
  },
  mergeButton: {
    padding: '10px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
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
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  modalMessage: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
  modalWarning: {
    margin: '0 0 20px 0',
    padding: '12px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#92400e',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
};

export default CustomerMerge;

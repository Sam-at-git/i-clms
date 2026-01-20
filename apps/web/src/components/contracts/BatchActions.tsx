import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const DELETE_CONTRACT = gql`
  mutation DeleteContract($id: ID!) {
    deleteContract(id: $id)
  }
`;

interface BatchActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
  totalCount?: number;
}

export function BatchActions({
  selectedIds,
  onClearSelection,
  onRefresh,
  totalCount,
}: BatchActionsProps) {
  const [deleteContract] = useMutation(DELETE_CONTRACT);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete contracts one by one
      await Promise.all(
        selectedIds.map((id) =>
          deleteContract({
            variables: { id },
          })
        )
      );

      // Clear selection and refresh
      onClearSelection();
      onRefresh();
      alert(`成功删除 ${selectedIds.length} 份合同`);
    } catch (error) {
      console.error('Batch delete error:', error);
      alert(`删除失败: ${(error as Error).message}`);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleBatchExport = () => {
    if (selectedIds.length === 0) return;

    // TODO: Implement actual export functionality
    // For now, just show a message
    alert(`批量导出功能开发中，已选择 ${selectedIds.length} 份合同`);
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      <div style={styles.container}>
        <div style={styles.info}>
          <span style={styles.count}>已选择 {selectedIds.length} 项</span>
          {totalCount && totalCount > selectedIds.length && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Select all in current page
                alert('选择全部功能开发中');
              }}
              style={styles.selectButton}
            >
              选择全部 {totalCount} 项
            </button>
          )}
        </div>
        <div style={styles.actions}>
          <button
            onClick={handleBatchExport}
            disabled={isDeleting}
            style={styles.exportButton}
          >
            📤 导出
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isDeleting}
            style={styles.deleteButton}
          >
            {isDeleting ? '删除中...' : '🗑 删除'}
          </button>
          <button
            onClick={onClearSelection}
            disabled={isDeleting}
            style={styles.cancelButton}
          >
            取消选择
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>确认删除</h3>
            <p style={styles.modalMessage}>
              确定要删除选中的 {selectedIds.length} 份合同吗？此操作不可撤销。
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowConfirm(false)}
                style={styles.modalCancelButton}
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={isDeleting}
                style={styles.modalConfirmButton}
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  count: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e40af',
  },
  selectButton: {
    padding: '4px 12px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  exportButton: {
    padding: '6px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteButton: {
    padding: '6px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cancelButton: {
    padding: '6px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  modalCancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalConfirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default BatchActions;

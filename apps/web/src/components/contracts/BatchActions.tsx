import { useState, useRef } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const DELETE_CONTRACT = gql`
  mutation DeleteContract($id: ID!) {
    deleteContract(id: $id)
  }
`;

const UPDATE_CONTRACT_STATUS = gql`
  mutation UpdateContractStatus($id: ID!, $status: ContractStatus!) {
    updateContract(id: $id, input: { status: $status }) {
      id
      status
    }
  }
`;

const ASSIGN_TAGS = gql`
  mutation AssignTags($contractIds: [ID!]!, $tagIds: [String!]!) {
  assignTagsToContract(contractIds: $contractIds, tagIds: $tagIds)
  }
`;

const EXPORT_CONTRACTS = gql`
  mutation ExportContracts($contractIds: [ID!]!, $format: ExportFormat!) {
  exportContracts(contractIds: $contractIds, format: $format) {
    downloadUrl
    fileName
  }
}
`;

const GET_TAGS = gql`
  query GetTags {
  tags {
    id
    name
    category
    color
    isActive
  }
}
`;

const CONTRACT_STATUSES = [
  { value: 'DRAFT', label: '草拟' },
  { value: 'PENDING_APPROVAL', label: '审批中' },
  { value: 'ACTIVE', label: '已生效' },
  { value: 'EXECUTING', label: '执行中' },
  { value: 'COMPLETED', label: '已完结' },
  { value: 'TERMINATED', label: '已终止' },
];

const EXPORT_FORMATS = [
  { value: 'EXCEL', label: 'Excel' },
  { value: 'PDF', label: 'PDF' },
  { value: 'CSV', label: 'CSV' },
];

interface BatchActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
  totalCount?: number;
  contracts?: any[];
}

export function BatchActions({
  selectedIds,
  onClearSelection,
  onRefresh,
  totalCount,
  contracts,
}: BatchActionsProps) {
  const [deleteContract] = useMutation(DELETE_CONTRACT);
  const [updateStatus] = useMutation(UPDATE_CONTRACT_STATUS);
  const [assignTags] = useMutation(ASSIGN_TAGS);
  const [exportContracts] = useMutation(EXPORT_CONTRACTS);

  const { data: tagsData } = useQuery(GET_TAGS);
  const tags = tagsData?.tags || [];

  // UI states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState<'delete' | 'status' | null>(null);

  // Status update
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Tag assignment
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Export
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('EXCEL');

  // Refs for closing menus on click outside
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useState(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target as Node)) {
        setShowTagMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          deleteContract({
            variables: { id },
          })
        )
      );

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

  const handleBatchStatusUpdate = async () => {
    if (!selectedStatus || selectedIds.length === 0) return;

    setIsUpdating(true);
    setShowStatusMenu(false);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateStatus({
            variables: { id, status: selectedStatus as any },
          })
        )
      );

      onClearSelection();
      onRefresh();
      alert(`成功更新 ${selectedIds.length} 份合同状态为 ${CONTRACT_STATUSES.find(s => s.value === selectedStatus)?.label}`);
    } catch (error) {
      console.error('Batch status update error:', error);
      alert(`状态更新失败: ${(error as Error).message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBatchTagAssignment = async () => {
    if (selectedTags.size === 0 || selectedIds.length === 0) return;

    setIsUpdating(true);
    setShowTagMenu(false);
    try {
      await assignTags({
        variables: {
          contractIds: selectedIds,
          tagIds: Array.from(selectedTags),
        },
      });

      setSelectedTags(new Set());
      onClearSelection();
      onRefresh();
      alert(`成功为 ${selectedIds.length} 份合同分配了 ${selectedTags.size} 个标签`);
    } catch (error) {
      console.error('Batch tag assignment error:', error);
      alert(`标签分配失败: ${(error as Error).message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBatchExport = async () => {
    if (selectedIds.length === 0) return;

    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const result = await exportContracts({
        variables: {
          contractIds: selectedIds,
          format: selectedFormat as any,
        },
      });

      // Trigger download
      if (result.data?.exportContracts) {
        const { downloadUrl, fileName } = result.data.exportContracts;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      alert(`成功导出 ${selectedIds.length} 份合同为 ${EXPORT_FORMATS.find(f => f.value === selectedFormat)?.label}`);
    } catch (error) {
      console.error('Batch export error:', error);
      alert(`导出失败: ${(error as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleTagSelection = (tagId: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTags(newSelected);
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
                // Select all contracts from current filtered list
                const allIds = contracts?.map((c: any) => c.id) || [];
                if (allIds.length > 0) {
                  // This would be handled by parent component
                  alert('选择全部功能 - 需要父组件传递完整列表');
                }
              }}
              style={styles.selectButton}
            >
              选择全部 {totalCount} 项
            </button>
          )}
        </div>
        <div style={styles.actions}>
          {/* Status Update Button */}
          <div style={styles.actionWithMenu} ref={statusMenuRef}>
            <button
              onClick={() => !isUpdating && setShowStatusMenu(!showStatusMenu)}
              disabled={isUpdating}
              style={styles.statusButton}
            >
              {isUpdating ? '更新中...' : '📊 状态'}
            </button>
            {showStatusMenu && (
              <div style={styles.dropdownMenu}>
                <div style={styles.menuHeader}>更新状态</div>
                {CONTRACT_STATUSES.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      setSelectedStatus(status.value);
                      setConfirmType('status');
                      setShowStatusMenu(false);
                      setShowConfirm(true);
                    }}
                    style={styles.menuItem}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag Assignment Button */}
          <div style={styles.actionWithMenu} ref={tagMenuRef}>
            <button
              onClick={() => !isUpdating && setShowTagMenu(!showTagMenu)}
              disabled={isUpdating}
              style={styles.tagButton}
            >
              {isUpdating ? '分配中...' : '🏷️ 标签'}
            </button>
            {showTagMenu && (
              <div style={styles.dropdownMenuLarge}>
                <div style={styles.menuHeader}>分配标签</div>
                <div style={styles.tagList}>
                  {tags.filter(t => t.isActive).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagSelection(tag.id)}
                      style={{
                        ...styles.tagButton,
                        ...(selectedTags.has(tag.id) && styles.tagButtonSelected),
                      }}
                    >
                      <span style={{ ...styles.tagDot, backgroundColor: tag.color }} />
                      {tag.name}
                      {selectedTags.has(tag.id) && ' ✓'}
                    </button>
                  ))}
                </div>
                {selectedTags.size > 0 && (
                  <div style={styles.menuFooter}>
                    <button
                      onClick={handleBatchTagAssignment}
                      style={styles.confirmButton}
                      disabled={isUpdating}
                    >
                      确认分配 ({selectedTags.size})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export Button */}
          <div style={styles.actionWithMenu} ref={exportMenuRef}>
            <button
              onClick={() => !isExporting && setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              style={styles.exportButton}
            >
              {isExporting ? '导出中...' : '📤 导出'}
            </button>
            {showExportMenu && (
              <div style={styles.dropdownMenu}>
                <div style={styles.menuHeader}>导出格式</div>
                {EXPORT_FORMATS.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => {
                      setSelectedFormat(format.value);
                      setShowExportMenu(false);
                      handleBatchExport();
                    }}
                    style={styles.menuItem}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete Button */}
          <button
            onClick={() => {
              setConfirmType('delete');
              setShowConfirm(true);
            }}
            disabled={isDeleting || isUpdating}
            style={styles.deleteButton}
          >
            {isDeleting ? '删除中...' : '🗑 删除'}
          </button>

          {/* Cancel Button */}
          <button
            onClick={onClearSelection}
            disabled={isDeleting || isUpdating}
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
            <h3 style={styles.modalTitle}>
              {confirmType === 'delete' ? '确认删除' : '确认状态更新'}
            </h3>
            <p style={styles.modalMessage}>
              {confirmType === 'delete'
                ? `确定要删除选中的 ${selectedIds.length} 份合同吗？此操作不可撤销。`
                : `确定要将选中的 ${selectedIds.length} 份合同状态更新为 "${CONTRACT_STATUSES.find(s => s.value === selectedStatus)?.label}" 吗？`
              }
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowConfirm(false)}
                style={styles.modalCancelButton}
              >
                取消
              </button>
              <button
                onClick={confirmType === 'delete' ? handleBatchDelete : handleBatchStatusUpdate}
                disabled={isDeleting || isUpdating}
                style={styles.modalConfirmButton}
              >
                {isDeleting || isUpdating ? '处理中...' : '确认'}
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
    flexWrap: 'wrap',
    gap: '8px',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
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
    flexWrap: 'wrap',
  },
  actionWithMenu: {
    position: 'relative',
  },
  statusButton: {
    padding: '6px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
    ':hover': {
      backgroundColor: '#2563eb',
    },
  },
  tagButton: {
    padding: '6px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#8b5cf6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
    ':hover': {
      backgroundColor: '#7c3aed',
    },
  },
  exportButton: {
    padding: '6px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
    ':hover': {
      backgroundColor: '#059669',
    },
  },
  deleteButton: {
    padding: '6px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
    ':hover': {
      backgroundColor: '#dc2626',
    },
  },
  cancelButton: {
    padding: '6px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
    ':hover': {
      backgroundColor: '#f9fafb',
    },
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 10,
    minWidth: '140px',
  },
  dropdownMenuLarge: {
    minWidth: '220px',
    maxHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
  },
  menuHeader: {
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  menuItem: {
    width: '100%',
    padding: '10px 12px',
    textAlign: 'left',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    ':last-child': {
      borderBottom: 'none',
    },
    ':hover': {
      backgroundColor: '#f9fafb',
    },
  },
  tagList: {
    maxHeight: '280px',
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tagButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  tagButtonSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  tagDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  menuFooter: {
    padding: '8px',
    borderTop: '1px solid #e5e7eb',
  },
  confirmButton: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#8b5cf6',
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
  },
  modalConfirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default BatchActions;

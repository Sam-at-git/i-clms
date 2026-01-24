import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

const UPDATE_CONTRACT_STATUS = gql`
  mutation UpdateContractStatus($id: ID!, $status: ContractStatus!) {
    updateContract(id: $id, input: { status: $status }) {
      id
      status
    }
  }
`;

interface ApprovalWorkflowProps {
  contractId: string;
  currentStatus: string;
  contractNo?: string;
  onStatusUpdate?: (newStatus: string) => void;
}

const APPROVAL_FLOW = [
  { status: 'DRAFT', label: '草拟', description: '合同起草中', icon: '📝' },
  { status: 'PENDING_APPROVAL', label: '审批中', description: '等待审批', icon: '⏳' },
  { status: 'ACTIVE', label: '已生效', description: '合同已签署生效', icon: '✅' },
  { status: 'EXECUTING', label: '执行中', description: '合同执行中', icon: '🚀' },
  { status: 'COMPLETED', label: '已完结', description: '合同已完成', icon: '🏁' },
  { status: 'TERMINATED', label: '已终止', description: '合同已终止', icon: '🛑' },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_APPROVAL', 'ACTIVE'],
  PENDING_APPROVAL: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['EXECUTING', 'TERMINATED'],
  EXECUTING: ['COMPLETED', 'TERMINATED'],
  COMPLETED: [],
  TERMINATED: [],
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING_APPROVAL: '#f59e0b',
  ACTIVE: '#10b981',
  EXECUTING: '#3b82f6',
  COMPLETED: '#6366f1',
  TERMINATED: '#ef4444',
};

const ACTION_LABELS: Record<string, string> = {
  to_PENDING_APPROVAL: '提交审批',
  to_ACTIVE: '通过审批',
  to_executing: '开始执行',
  to_COMPLETED: '完结合同',
  to_terminated: '终止合同',
  to_draft: '退回草稿',
};

export function ApprovalWorkflow({
  contractId,
  currentStatus,
  contractNo,
  onStatusUpdate,
}: ApprovalWorkflowProps) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const [updateContractStatus, { loading, error }] = useMutation(UPDATE_CONTRACT_STATUS, {
    onCompleted: (data) => {
      const newStatus = data.updateContract.status;
      onStatusUpdate?.(newStatus);
      setShowConfirm(false);
      setShowActionMenu(false);
      setReason('');
      alert(`状态已更新为: ${getStatusLabel(newStatus)}`);
    },
    onError: (err) => {
      alert(`更新失败: ${(err as Error).message}`);
    },
  });

  const getCurrentStepIndex = () => {
    return APPROVAL_FLOW.findIndex(step => step.status === currentStatus);
  };

  const getAvailableActions = () => {
    const transitions = STATUS_TRANSITIONS[currentStatus] || [];
    return transitions.map(targetStatus => ({
      value: `to_${targetStatus.toLowerCase()}`,
      label: ACTION_LABELS[`to_${targetStatus.toLowerCase()}`] || `变更为${getStatusLabel(targetStatus)}`,
      targetStatus,
    }));
  };

  const handleActionClick = (action: { value: string; label: string; targetStatus: string }) => {
    setSelectedAction(action.label);
    setShowActionMenu(false);
    setShowConfirm(true);
  };

  const handleConfirmAction = () => {
    const action = getAvailableActions().find(a => a.label === selectedAction);
    if (action) {
      updateContractStatus({
        variables: {
          id: contractId,
          status: action.targetStatus as any,
        },
      });
    }
  };

  const getStatusLabel = (status: string) => {
    const step = APPROVAL_FLOW.find(s => s.status === status);
    return step?.label || status;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>审批流程</h3>
        {contractNo && (
          <span style={styles.contractNo}>{contractNo}</span>
        )}
      </div>

      {/* Progress Visualization */}
      <div style={styles.progressContainer}>
        {APPROVAL_FLOW.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div key={step.status} style={styles.stepItem}>
              <div style={styles.stepDotWrapper}>
                <div
                  style={{
                    ...styles.stepDot,
                    ...(isCompleted && styles.stepDotCompleted),
                    ...(isCurrent && styles.stepDotCurrent),
                    ...(isPending && styles.stepDotPending),
                  }}
                >
                  {step.icon}
                </div>
                {index < APPROVAL_FLOW.length - 1 && (
                  <div
                    style={{
                      ...styles.stepLine,
                      ...(isCompleted && styles.stepLineCompleted),
                    }}
                  />
                )}
              </div>
              <div style={styles.stepInfo}>
                <div style={styles.stepLabel}>{step.label}</div>
                <div style={styles.stepDesc}>{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Status */}
      <div style={styles.currentStatusCard}>
        <div style={styles.statusHeader}>
          <span style={styles.statusLabel}>当前状态:</span>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: STATUS_COLORS[currentStatus],
            }}
          >
            {getStatusLabel(currentStatus)}
          </span>
        </div>
        <div style={styles.statusMeta}>
          <span style={styles.metaItem}>
            步骤 {currentStepIndex + 1} / {APPROVAL_FLOW.length}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {getAvailableActions().length > 0 && (
        <div style={styles.actionsContainer}>
          <button
            onClick={() => setShowActionMenu(!showActionMenu)}
            style={styles.actionButton}
            disabled={loading}
          >
            {loading ? '处理中...' : '▶ 推进流程'}
          </button>

          {showActionMenu && (
            <div style={styles.actionMenu}>
              {getAvailableActions().map((action) => (
                <button
                  key={action.value}
                  onClick={() => handleActionClick(action)}
                  style={styles.actionMenuItem}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Information Cards */}
      <div style={styles.infoCards}>
        {APPROVAL_FLOW.map((step) => {
          const stepIndex = APPROVAL_FLOW.findIndex(s => s.status === step.status);
          const isCompleted = stepIndex < currentStepIndex;
          const isCurrent = stepIndex === currentStepIndex;
          const isPending = stepIndex > currentStepIndex;

          return (
            <div
              key={step.status}
              style={{
                ...styles.infoCard,
                ...(isCurrent && styles.infoCardCurrent),
                ...(isCompleted && styles.infoCardCompleted),
              }}
            >
              <div style={styles.cardIcon}>{step.icon}</div>
              <div style={styles.cardContent}>
                <div style={styles.cardTitle}>{step.label}</div>
                <div style={styles.cardDesc}>{step.description}</div>
              </div>
              <div style={styles.cardStatus}>
                {isCompleted && <span style={styles.statusCompleted}>✓ 已完成</span>}
                {isCurrent && <span style={styles.statusCurrent}>进行中</span>}
                {isPending && <span style={styles.statusPending}>待处理</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>确认操作</h3>
            <p style={styles.modalMessage}>
              确定要将合同状态从 <strong>{getStatusLabel(currentStatus)}</strong> 变更为{' '}
              <strong>{selectedAction}</strong> 吗？
            </p>

            {selectedAction?.includes('退回') && (
              <div style={styles.reasonInput}>
                <label style={styles.reasonLabel}>退回原因（可选）:</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请输入退回原因..."
                  style={styles.reasonTextarea}
                  rows={3}
                />
              </div>
            )}

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowConfirm(false)}
                style={styles.modalCancel}
              >
                取消
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={loading}
                style={styles.modalConfirm}
              >
                {loading ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorMessage}>
          操作失败: {(error as Error).message}
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
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  contractNo: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 500,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  stepItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  stepDotWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    marginBottom: '8px',
  },
  stepDot: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    zIndex: 1,
  },
  stepDotCompleted: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  stepDotCurrent: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  stepDotPending: {
    backgroundColor: '#e5e7eb',
  },
  stepLine: {
    flex: 1,
    height: '3px',
    backgroundColor: '#e5e7eb',
    margin: '0 4px',
  },
  stepLineCompleted: {
    backgroundColor: '#10b981',
  },
  stepInfo: {
    textAlign: 'center',
  },
  stepLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '2px',
  },
  stepDesc: {
    fontSize: '12px',
    color: '#6b7280',
  },
  currentStatusCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #bae6fd',
    marginBottom: '16px',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 12px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '4px',
  },
  statusMeta: {
    fontSize: '13px',
    color: '#0369a1',
  },
  metaItem: {
    display: 'inline-block',
    marginRight: '16px',
  },
  actionsContainer: {
    position: 'relative',
    marginBottom: '20px',
  },
  actionButton: {
    padding: '10px 20px',
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
  actionMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 10,
    minWidth: '150px',
  },
  actionMenuItem: {
    width: '100%',
    padding: '10px 16px',
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
  infoCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  infoCard: {
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  infoCardCurrent: {
    border: '2px solid #3b82f6',
    backgroundColor: '#eff6ff',
    opacity: 1,
  },
  infoCardCompleted: {
    opacity: 1,
  },
  cardIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  cardContent: {
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '2px',
  },
  cardDesc: {
    fontSize: '12px',
    color: '#6b7280',
  },
  cardStatus: {
    fontSize: '12px',
    fontWeight: 500,
  },
  statusCompleted: {
    color: '#10b981',
  },
  statusCurrent: {
    color: '#3b82f6',
  },
  statusPending: {
    color: '#9ca3af',
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
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
  reasonInput: {
    marginBottom: '16px',
  },
  reasonLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  reasonTextarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  modalCancel: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  modalConfirm: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  errorMessage: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '14px',
  },
};

export default ApprovalWorkflow;

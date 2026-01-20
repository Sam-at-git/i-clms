import { useState } from 'react';

interface Milestone {
  id: string;
  sequence: number;
  name: string;
  deliverables: string | null;
  amount: { toString: () => string } | null;
  paymentPercentage: { toString: () => string } | null;
  plannedDate: Date | null;
  actualDate: Date | null;
  acceptanceCriteria: string | null;
  status: string;
  deliverableFileUrl: string | null;
  deliverableFileName: string | null;
  deliverableUploadedAt: Date | null;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  acceptedByName: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectedByName: string | null;
  rejectionReason: string | null;
  detail: {
    contract: {
      id: string;
      contractNo: string;
      name: string;
      customer: {
        id: string;
        fullName: string;
      };
    };
  };
}

interface MilestoneActionsProps {
  milestone: Milestone;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string, notes?: string) => Promise<void>;
  onUploadDeliverable: (milestoneId: string, fileUrl: string, fileName: string, description?: string) => Promise<void>;
  onAcceptMilestone: (id: string, notes?: string) => Promise<void>;
  onRejectMilestone: (id: string, reason: string) => Promise<void>;
  MilestoneStatus: Record<string, string>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: '待开始', color: '#6b7280', bgColor: '#f3f4f6' },
  IN_PROGRESS: { label: '进行中', color: '#3b82f6', bgColor: '#dbeafe' },
  DELIVERED: { label: '已交付', color: '#f59e0b', bgColor: '#fef3c7' },
  ACCEPTED: { label: '已验收', color: '#10b981', bgColor: '#d1fae5' },
  REJECTED: { label: '被拒绝', color: '#ef4444', bgColor: '#fee2e2' },
};

export function MilestoneActions({
  milestone,
  onClose,
  onStatusUpdate,
  onUploadDeliverable,
  onAcceptMilestone,
  onRejectMilestone,
  MilestoneStatus,
}: MilestoneActionsProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'upload' | 'reject'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Upload state
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');

  // Reject state
  const [rejectReason, setRejectReason] = useState('');

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount: { toString: () => string } | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount.toString());
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleFileUpload = async () => {
    if (!fileUrl || !fileName) {
      setMessage('请输入文件URL和文件名');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      await onUploadDeliverable(milestone.id, fileUrl, fileName, description);
      setMessage('交付物上传成功！');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setMessage('上传失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    setMessage('');

    try {
      await onAcceptMilestone(milestone.id, message || undefined);
      setMessage('里程碑已验收通过！');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setMessage('操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setMessage('请输入拒绝原因');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      await onRejectMilestone(milestone.id, rejectReason);
      setMessage('里程碑已拒绝');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setMessage('操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const config = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.PENDING;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>里程碑详情</h2>
            <p style={styles.subtitle}>{milestone.name}</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        {/* Status Badge */}
        <div style={styles.statusRow}>
          <span
            style={{
              ...styles.statusBadge,
              color: config.color,
              backgroundColor: config.bgColor,
            }}
          >
            {config.label}
          </span>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              ...styles.tab,
              ...(activeTab === 'details' ? styles.tabActive : {}),
            }}
          >
            详情
          </button>
          {milestone.status === MilestoneStatus.IN_PROGRESS && (
            <button
              onClick={() => setActiveTab('upload')}
              style={{
                ...styles.tab,
                ...(activeTab === 'upload' ? styles.tabActive : {}),
              }}
            >
              上传交付物
            </button>
          )}
          {milestone.status === MilestoneStatus.DELIVERED && (
            <button
              onClick={() => setActiveTab('details')}
              style={{
                ...styles.tab,
                ...(activeTab === 'details' ? styles.tabActive : {}),
              }}
            >
              验收操作
            </button>
          )}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'details' && (
            <div style={styles.details}>
              <div style={styles.detailSection}>
                <h3 style={styles.detailTitle}>合同信息</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>合同编号:</span>
                  <span style={styles.detailValue}>{milestone.detail.contract.contractNo}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>合同名称:</span>
                  <span style={styles.detailValue}>{milestone.detail.contract.name}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>客户:</span>
                  <span style={styles.detailValue}>{milestone.detail.contract.customer.fullName}</span>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h3 style={styles.detailTitle}>里程碑信息</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>金额:</span>
                  <span style={styles.detailValue}>{formatCurrency(milestone.amount)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>付款比例:</span>
                  <span style={styles.detailValue}>
                    {milestone.paymentPercentage ? `${milestone.paymentPercentage.toString()}%` : '-'}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>计划日期:</span>
                  <span style={styles.detailValue}>{formatDate(milestone.plannedDate)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>实际日期:</span>
                  <span style={styles.detailValue}>{formatDate(milestone.actualDate)}</span>
                </div>
                {milestone.deliverables && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>交付物:</span>
                    <span style={styles.detailValue}>{milestone.deliverables}</span>
                  </div>
                )}
              </div>

              {milestone.deliverableFileUrl && (
                <div style={styles.detailSection}>
                  <h3 style={styles.detailTitle}>已上传交付物</h3>
                  <a
                    href={milestone.deliverableFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.fileLink}
                  >
                    {milestone.deliverableFileName || '查看文件'}
                  </a>
                  <p style={styles.uploadTime}>
                    上传时间: {formatDate(milestone.deliverableUploadedAt)}
                  </p>
                </div>
              )}

              {milestone.acceptedAt && (
                <div style={styles.detailSection}>
                  <h3 style={styles.detailTitle}>验收信息</h3>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>验收时间:</span>
                    <span style={styles.detailValue}>{formatDate(milestone.acceptedAt)}</span>
                  </div>
                  {milestone.acceptedByName && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>验收人:</span>
                      <span style={styles.detailValue}>{milestone.acceptedByName}</span>
                    </div>
                  )}
                </div>
              )}

              {milestone.rejectedAt && (
                <div style={styles.detailSection}>
                  <h3 style={styles.detailTitle}>拒绝信息</h3>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>拒绝时间:</span>
                    <span style={styles.detailValue}>{formatDate(milestone.rejectedAt)}</span>
                  </div>
                  {milestone.rejectedByName && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>拒绝人:</span>
                      <span style={styles.detailValue}>{milestone.rejectedByName}</span>
                    </div>
                  )}
                  {milestone.rejectionReason && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>拒绝原因:</span>
                      <span style={styles.detailValue}>{milestone.rejectionReason}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {milestone.status === MilestoneStatus.DELIVERED && (
                <div style={styles.actionSection}>
                  <div style={styles.actionButtons}>
                    <button
                      onClick={handleAccept}
                      disabled={isSubmitting}
                      style={{
                        ...styles.actionBtn,
                        ...styles.acceptBtn,
                      }}
                    >
                      {isSubmitting ? '处理中...' : '验收通过'}
                    </button>
                    <button
                      onClick={() => setActiveTab('reject')}
                      style={{
                        ...styles.actionBtn,
                        ...styles.rejectBtn,
                      }}
                    >
                      拒绝
                    </button>
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="验收备注（可选）"
                    style={styles.notesTextarea}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div style={styles.uploadForm}>
              <h3 style={styles.formTitle}>上传交付物</h3>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>文件URL *</label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://storage.example.com/file.pdf"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>文件名 *</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="deliverable.pdf"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="交付物描述（可选）"
                  style={styles.formTextarea}
                />
              </div>
              <button
                onClick={handleFileUpload}
                disabled={isSubmitting || !fileUrl || !fileName}
                style={{
                  ...styles.submitBtn,
                  ...(isSubmitting || !fileUrl || !fileName ? styles.submitBtnDisabled : {}),
                }}
              >
                {isSubmitting ? '上传中...' : '上传交付物'}
              </button>
            </div>
          )}

          {activeTab === 'reject' && (
            <div style={styles.rejectForm}>
              <h3 style={styles.formTitle}>拒绝里程碑</h3>
              <p style={styles.formHint}>
                请说明拒绝原因，这将通知项目团队进行整改。
              </p>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>拒绝原因 *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请详细说明拒绝的原因..."
                  style={styles.formTextarea}
                  rows={5}
                />
              </div>
              <div style={styles.actionButtons}>
                <button
                  onClick={() => setActiveTab('details')}
                  style={styles.cancelBtn}
                >
                  取消
                </button>
                <button
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectReason.trim()}
                  style={{
                    ...styles.submitBtn,
                    ...(isSubmitting || !rejectReason.trim() ? styles.submitBtnDisabled : {}),
                    ...styles.rejectBtn,
                  }}
                >
                  {isSubmitting ? '处理中...' : '确认拒绝'}
                </button>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div style={{
              ...styles.message,
              ...(message.includes('成功') || message.includes('已验收') ? styles.messageSuccess : styles.messageError),
            }}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1000,
  },
  drawer: {
    width: '100%',
    maxWidth: '500px',
    height: '100%',
    backgroundColor: '#fff',
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  closeButton: {
    fontSize: '24px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    lineHeight: 1,
  },
  statusRow: {
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  statusBadge: {
    fontSize: '13px',
    padding: '6px 12px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  detailSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
  },
  detailTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
  },
  detailLabel: {
    color: '#6b7280',
  },
  detailValue: {
    color: '#1f2937',
    fontWeight: 500,
    textAlign: 'right',
  },
  fileLink: {
    display: 'inline-block',
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
    marginBottom: '4px',
  },
  uploadTime: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  acceptBtn: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
  notesTextarea: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    resize: 'vertical',
    minHeight: '60px',
    fontFamily: 'inherit',
  },
  uploadForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rejectForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0',
  },
  formHint: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  formInput: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  formTextarea: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  submitBtn: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  cancelBtn: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  message: {
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '16px',
  },
  messageSuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  messageError: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
};

export default MilestoneActions;

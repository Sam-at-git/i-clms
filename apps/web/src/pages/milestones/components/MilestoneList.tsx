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
  rejectedAt: Date | null;
  rejectedBy: string | null;
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

interface MilestoneListProps {
  milestones: Milestone[];
  onSelectMilestone: (milestone: Milestone) => void;
  onStatusUpdate: (id: string, status: string, notes?: string) => Promise<void>;
  onUploadDeliverable?: (milestoneId: string, fileUrl: string, fileName: string, description?: string) => Promise<void>;
  onAcceptMilestone: (id: string, notes?: string) => Promise<void>;
  onRejectMilestone?: (id: string, reason: string) => Promise<void>;
  MilestoneStatus: Record<string, string>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: '待开始', color: '#6b7280', bgColor: '#f3f4f6' },
  IN_PROGRESS: { label: '进行中', color: '#3b82f6', bgColor: '#dbeafe' },
  DELIVERED: { label: '已交付', color: '#f59e0b', bgColor: '#fef3c7' },
  ACCEPTED: { label: '已验收', color: '#10b981', bgColor: '#d1fae5' },
  REJECTED: { label: '被拒绝', color: '#ef4444', bgColor: '#fee2e2' },
};

export function MilestoneList({
  milestones,
  onSelectMilestone,
  onStatusUpdate,
  onUploadDeliverable,
  onAcceptMilestone,
  onRejectMilestone,
  MilestoneStatus,
}: MilestoneListProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    setStatusUpdating(id);
    try {
      await onStatusUpdate(id, newStatus);
    } finally {
      setStatusUpdating(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedMilestone(expandedMilestone === id ? null : id);
  };

  const isOverdue = (milestone: Milestone) => {
    if (!milestone.plannedDate) return false;
    const planned = new Date(milestone.plannedDate);
    const now = new Date();
    return planned < now && milestone.status !== MilestoneStatus.ACCEPTED;
  };

  return (
    <div style={styles.container}>
      {milestones.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>暂无里程碑数据</p>
          <p style={styles.emptyHint}>请调整筛选条件</p>
        </div>
      ) : (
        <div style={styles.list}>
          {milestones.map((milestone) => {
            const config = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.PENDING;
            const overdue = isOverdue(milestone);

            return (
              <div
                key={milestone.id}
                style={{
                  ...styles.card,
                  ...(overdue ? styles.cardOverdue : {}),
                }}
              >
                {/* Card Header */}
                <div
                  style={styles.cardHeader}
                  onClick={() => toggleExpand(milestone.id)}
                >
                  <div style={styles.cardHeaderLeft}>
                    <span style={styles.sequence}>{milestone.sequence}</span>
                    <span style={styles.name}>{milestone.name}</span>
                    {overdue && (
                      <span style={styles.overdueBadge}>逾期</span>
                    )}
                  </div>
                  <div style={styles.cardHeaderRight}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        color: config.color,
                        backgroundColor: config.bgColor,
                      }}
                    >
                      {config.label}
                    </span>
                    <span style={styles.expandIcon}>
                      {expandedMilestone === milestone.id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                {expandedMilestone === milestone.id && (
                  <div style={styles.cardContent}>
                    {/* Contract Info */}
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>合同信息</h4>
                      <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>合同编号:</span>
                          <span style={styles.infoValue}>{milestone.detail.contract.contractNo}</span>
                        </div>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>合同名称:</span>
                          <span style={styles.infoValue}>{milestone.detail.contract.name}</span>
                        </div>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>客户:</span>
                          <span style={styles.infoValue}>{milestone.detail.contract.customer.fullName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Milestone Details */}
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>里程碑详情</h4>
                      <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>金额:</span>
                          <span style={styles.infoValue}>{formatCurrency(milestone.amount)}</span>
                        </div>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>付款比例:</span>
                          <span style={styles.infoValue}>
                            {milestone.paymentPercentage ? `${milestone.paymentPercentage.toString()}%` : '-'}
                          </span>
                        </div>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>计划日期:</span>
                          <span style={styles.infoValue}>{formatDate(milestone.plannedDate)}</span>
                        </div>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>实际日期:</span>
                          <span style={styles.infoValue}>{formatDate(milestone.actualDate)}</span>
                        </div>
                      </div>
                      {milestone.deliverables && (
                        <div style={styles.deliverables}>
                          <span style={styles.infoLabel}>交付物:</span>
                          <span style={styles.infoValue}>{milestone.deliverables}</span>
                        </div>
                      )}
                    </div>

                    {/* Deliverable Info */}
                    {milestone.deliverableFileUrl && (
                      <div style={styles.section}>
                        <h4 style={styles.sectionTitle}>已上传交付物</h4>
                        <div style={styles.deliverableFile}>
                          <a
                            href={milestone.deliverableFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.fileLink}
                          >
                            {milestone.deliverableFileName || '查看文件'}
                          </a>
                          <span style={styles.uploadDate}>
                            上传时间: {formatDate(milestone.deliverableUploadedAt)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Accept/Reject Info */}
                    {milestone.acceptedAt && (
                      <div style={styles.section}>
                        <h4 style={styles.sectionTitle}>验收信息</h4>
                        <div style={styles.infoGrid}>
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>验收时间:</span>
                            <span style={styles.infoValue}>{formatDate(milestone.acceptedAt)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {milestone.rejectedAt && (
                      <div style={styles.section}>
                        <h4 style={styles.sectionTitle}>拒绝信息</h4>
                        <div style={styles.infoGrid}>
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>拒绝时间:</span>
                            <span style={styles.infoValue}>{formatDate(milestone.rejectedAt)}</span>
                          </div>
                          {milestone.rejectionReason && (
                            <div style={styles.infoItem}>
                              <span style={styles.infoLabel}>拒绝原因:</span>
                              <span style={styles.infoValue}>{milestone.rejectionReason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={styles.actions}>
                      <button
                        onClick={() => onSelectMilestone(milestone)}
                        style={styles.actionButton}
                      >
                        查看详情
                      </button>
                      {milestone.status === MilestoneStatus.PENDING && (
                        <button
                          onClick={() => handleStatusChange(milestone.id, MilestoneStatus.IN_PROGRESS)}
                          disabled={statusUpdating === milestone.id}
                          style={{
                            ...styles.actionButton,
                            ...styles.primaryButton,
                          }}
                        >
                          {statusUpdating === milestone.id ? '处理中...' : '开始执行'}
                        </button>
                      )}
                      {milestone.status === MilestoneStatus.IN_PROGRESS && (
                        <button
                          onClick={() => onSelectMilestone(milestone)}
                          style={{
                            ...styles.actionButton,
                            ...styles.primaryButton,
                          }}
                        >
                          上传交付物
                        </button>
                      )}
                      {milestone.status === MilestoneStatus.DELIVERED && (
                        <>
                          <button
                            onClick={() => onAcceptMilestone(milestone.id)}
                            style={{
                              ...styles.actionButton,
                              ...styles.acceptButton,
                            }}
                          >
                            验收通过
                          </button>
                          <button
                            onClick={() => onSelectMilestone(milestone)}
                            style={{
                              ...styles.actionButton,
                              ...styles.rejectButton,
                            }}
                          >
                            拒绝
                          </button>
                        </>
                      )}
                      {milestone.status === MilestoneStatus.REJECTED && (
                        <button
                          onClick={() => onSelectMilestone(milestone)}
                          style={{
                            ...styles.actionButton,
                            ...styles.primaryButton,
                          }}
                        >
                          重新交付
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    borderBottom: '1px solid #e5e7eb',
  },
  cardOverdue: {
    borderLeft: '4px solid #ef4444',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sequence: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderRadius: '50%',
  },
  name: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#1f2937',
  },
  overdueBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '4px',
    fontWeight: 500,
  },
  cardHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  expandIcon: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  cardContent: {
    padding: '0 16px 16px 16px',
    backgroundColor: '#f9fafb',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    gap: '8px',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '13px',
    color: '#1f2937',
    fontWeight: 500,
  },
  deliverables: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#374151',
  },
  deliverableFile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '4px',
  },
  fileLink: {
    fontSize: '13px',
    color: '#3b82f6',
    textDecoration: 'none',
  },
  uploadDate: {
    fontSize: '12px',
    color: '#6b7280',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e5e7eb',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryButton: {
    color: '#3b82f6',
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  acceptButton: {
    color: '#10b981',
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  rejectButton: {
    color: '#ef4444',
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 8px 0',
  },
  emptyHint: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: 0,
  },
};

export default MilestoneList;

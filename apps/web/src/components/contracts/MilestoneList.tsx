import { useState } from 'react';

interface Milestone {
  id?: string;
  name: string;
  description?: string;
  dueDate?: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  deliverables?: string[];
}

interface MilestoneListProps {
  milestones: Milestone[];
  editable?: boolean;
  onChange?: (milestones: Milestone[]) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#9ca3af',
  in_progress: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

export function MilestoneList({ milestones, editable = false, onChange }: MilestoneListProps) {
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>(milestones);

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: any) => {
    const newMilestones = [...localMilestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setLocalMilestones(newMilestones);
    onChange?.(newMilestones);
  };

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      name: '',
      amount: 0,
      status: 'pending',
    };
    const newMilestones = [...localMilestones, newMilestone];
    setLocalMilestones(newMilestones);
    onChange?.(newMilestones);
  };

  const handleRemoveMilestone = (index: number) => {
    const newMilestones = localMilestones.filter((_, i) => i !== index);
    setLocalMilestones(newMilestones);
    onChange?.(newMilestones);
  };

  const totalAmount = localMilestones.reduce((sum, m) => sum + m.amount, 0);
  const completedAmount = localMilestones
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + m.amount, 0);
  const progress = totalAmount > 0 ? (completedAmount / totalAmount) * 100 : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>里程碑</h3>
        {editable && (
          <button onClick={handleAddMilestone} style={styles.addButton}>
            + 添加里程碑
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {localMilestones.length > 0 && (
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>完成进度</span>
            <span style={styles.progressValue}>
              {completedAmount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} / {totalAmount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div style={styles.progressBarContainer}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress}%`,
                }}
              />
            </div>
            <span style={styles.progressPercent}>{progress.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Milestone List */}
      <div style={styles.list}>
        {localMilestones.map((milestone, index) => (
          <div key={index} style={styles.milestoneCard}>
            <div style={styles.milestoneHeader}>
              {editable ? (
                <input
                  type="text"
                  value={milestone.name}
                  onChange={(e) => handleMilestoneChange(index, 'name', e.target.value)}
                  style={styles.nameInput}
                  placeholder="里程碑名称"
                />
              ) : (
                <span style={styles.milestoneName}>{milestone.name}</span>
              )}
              <div style={styles.milestoneMeta}>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: STATUS_COLORS[milestone.status],
                  }}
                >
                  {STATUS_LABELS[milestone.status]}
                </span>
                {editable && (
                  <button
                    onClick={() => handleRemoveMilestone(index)}
                    style={styles.removeButton}
                  >
                    删除
                  </button>
                )}
              </div>
            </div>

            {milestone.description && (
              <div style={styles.description}>{milestone.description}</div>
            )}

            <div style={styles.milestoneDetails}>
              <div style={styles.detail}>
                <span style={styles.detailLabel}>金额：</span>
                {editable ? (
                  <input
                    type="number"
                    value={milestone.amount}
                    onChange={(e) => handleMilestoneChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    style={styles.amountInput}
                    min="0"
                    step="0.01"
                  />
                ) : (
                  <span style={styles.detailValue}>
                    ¥{milestone.amount.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </div>

              {milestone.dueDate && (
                <div style={styles.detail}>
                  <span style={styles.detailLabel}>截止日期：</span>
                  <span style={styles.detailValue}>
                    {new Date(milestone.dueDate).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}

              {editable && (
                <div style={styles.detail}>
                  <span style={styles.detailLabel}>状态：</span>
                  <select
                    value={milestone.status}
                    onChange={(e) => handleMilestoneChange(index, 'status', e.target.value)}
                    style={styles.select}
                  >
                    <option value="pending">待开始</option>
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                    <option value="cancelled">已取消</option>
                  </select>
                </div>
              )}
            </div>

            {milestone.deliverables && milestone.deliverables.length > 0 && (
              <div style={styles.deliverables}>
                <div style={styles.deliverablesTitle}>交付物：</div>
                <ul style={styles.deliverablesList}>
                  {milestone.deliverables.map((deliverable, i) => (
                    <li key={i} style={styles.deliverableItem}>
                      {deliverable}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {localMilestones.length === 0 && (
          <div style={styles.empty}>暂无里程碑</div>
        )}
      </div>

      {/* Summary */}
      {localMilestones.length > 0 && (
        <div style={styles.summary}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>里程碑总数：</span>
            <span style={styles.summaryValue}>{localMilestones.length} 个</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>总金额：</span>
            <span style={styles.summaryValue}>
              ¥{totalAmount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>已收款：</span>
            <span style={styles.summaryValue}>
              ¥{completedAmount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  addButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  progressSection: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  progressLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  progressValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  progressBarContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s',
  },
  progressPercent: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#10b981',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  milestoneCard: {
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  milestoneName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  nameInput: {
    flex: 1,
    padding: '6px 8px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    marginRight: '8px',
  },
  milestoneMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '4px',
    color: '#fff',
  },
  removeButton: {
    padding: '4px 8px',
    fontSize: '11px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  description: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  milestoneDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  detail: {
    display: 'flex',
    fontSize: '13px',
  },
  detailLabel: {
    color: '#6b7280',
  },
  detailValue: {
    color: '#111827',
    fontWeight: 500,
  },
  amountInput: {
    width: '120px',
    padding: '4px 8px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  select: {
    padding: '4px 8px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  deliverables: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  deliverablesTitle: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  deliverablesList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#4b5563',
  },
  deliverableItem: {
    marginBottom: '2px',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  summary: {
    display: 'flex',
    gap: '24px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  summaryItem: {
    display: 'flex',
    gap: '8px',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
};

export default MilestoneList;
